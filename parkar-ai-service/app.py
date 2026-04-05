"""
ParKar AI Document Verification Service
=======================================
Analyzes car-related document images for:
  1. Document type detection (is it a car document?)
  2. Image quality assessment (blur, brightness, resolution, noise)

Stack: Flask + OpenCV + Tesseract OCR
Cost:  100% FREE / open-source
"""

import io
import logging
import math
import time

import cv2
import numpy as np
import pytesseract
from flask import Flask, jsonify, request
from PIL import Image

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Tunable thresholds  (edit freely)
# ─────────────────────────────────────────────
THRESHOLDS = {
    # Quality
    "blur_min": 80.0,          # Laplacian variance – below = blurry
    "brightness_min": 40.0,    # 0-255 mean – below = too dark
    "brightness_max": 220.0,   # above = over-exposed
    "resolution_min_px": 100_000,  # width × height – below = low-res
    "noise_max": 35.0,         # std-dev of high-freq component – above = noisy

    # Document detection
    "doc_keyword_hits_min": 1, # how many car-doc keywords must OCR find
    "doc_confidence_base": 0.50,
}

# ─────────────────────────────────────────────
# Car-document keyword vocabulary
# ─────────────────────────────────────────────
CAR_DOC_KEYWORDS = [
    # Registration / ownership
    "registration", "certificate", "vehicle", "motor", "automobile",
    "reg no", "reg.", "chassis", "engine no", "owner", "ownership",
    # License
    "license", "licence", "driving", "driver", "permit", "class",
    "dob", "date of birth", "expiry", "expires", "valid",
    # Insurance
    "insurance", "insured", "policy", "premium", "coverage",
    "insurer", "third party", "comprehensive",
    # Generic doc markers
    "plate", "plate no", "authority", "issued", "issue date",
    "transport", "highway", "road", "department",
]

NEGATIVE_KEYWORDS = [
    "instagram", "facebook", "selfie", "landscape", "recipe",
    "menu", "invoice", "product", "price list",
]


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _bytes_to_cv2(data: bytes) -> np.ndarray:
    """Decode raw image bytes → OpenCV BGR array."""
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Cannot decode image – unsupported format or corrupt file.")
    return img


def _blur_score(gray: np.ndarray) -> float:
    """Laplacian variance – higher = sharper."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _brightness_score(gray: np.ndarray) -> float:
    """Mean pixel intensity (0-255)."""
    return float(np.mean(gray))


def _noise_score(gray: np.ndarray) -> float:
    """
    High-frequency energy via Gaussian subtraction.
    Higher value = more noise.
    """
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    diff = cv2.absdiff(gray, blurred)
    return float(np.std(diff))


def _resolution_px(img: np.ndarray) -> int:
    h, w = img.shape[:2]
    return h * w


def _run_ocr(gray: np.ndarray) -> str:
    """Run Tesseract and return lower-cased text."""
    pil_img = Image.fromarray(gray)
    config = "--oem 3 --psm 6"  # assume uniform block of text
    try:
        text = pytesseract.image_to_string(pil_img, config=config)
        return text.lower()
    except Exception as e:
        logger.warning("OCR failed: %s", e)
        return ""


def _keyword_hits(ocr_text: str) -> tuple[int, list[str]]:
    """Return (count, matched_keywords) for car-doc vocabulary."""
    hits = [kw for kw in CAR_DOC_KEYWORDS if kw in ocr_text]
    return len(hits), hits


def _negative_hits(ocr_text: str) -> list[str]:
    return [kw for kw in NEGATIVE_KEYWORDS if kw in ocr_text]


# ─────────────────────────────────────────────
# Core analyser
# ─────────────────────────────────────────────

def analyse_image(image_bytes: bytes) -> dict:
    t0 = time.time()
    issues: list[str] = []

    # ── Decode ──────────────────────────────
    img_bgr = _bytes_to_cv2(image_bytes)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # ── Quality checks ───────────────────────
    blur    = _blur_score(gray)
    bright  = _brightness_score(gray)
    noise   = _noise_score(gray)
    res_px  = _resolution_px(img_bgr)
    th      = THRESHOLDS

    if blur < th["blur_min"]:
        issues.append("blurry")
    if bright < th["brightness_min"]:
        issues.append("too dark")
    if bright > th["brightness_max"]:
        issues.append("over-exposed")
    if res_px < th["resolution_min_px"]:
        issues.append("low resolution")
    if noise > th["noise_max"]:
        issues.append("noisy")

    # Cropping heuristic: check if large bright/dark band on any edge
    h, w = gray.shape
    edge_margin = max(5, int(min(h, w) * 0.04))
    edges = {
        "top":    gray[:edge_margin, :],
        "bottom": gray[-edge_margin:, :],
        "left":   gray[:, :edge_margin],
        "right":  gray[:, -edge_margin:],
    }
    saturated_edges = [
        name for name, band in edges.items()
        if np.mean(band) < 20 or np.mean(band) > 240
    ]
    if len(saturated_edges) >= 2:
        issues.append("cropped or cut-off")

    clarity = "clear" if not issues else "unclear"

    # ── Document detection ───────────────────
    ocr_text   = _run_ocr(gray)
    pos_hits, matched_kws = _keyword_hits(ocr_text)
    neg_hits   = _negative_hits(ocr_text)

    is_car_document = (
        pos_hits >= th["doc_keyword_hits_min"]
        and len(neg_hits) == 0
    )

    # ── Confidence scoring ───────────────────
    # Base confidence from keyword density
    kw_score = min(1.0, pos_hits / max(len(CAR_DOC_KEYWORDS) * 0.15, 1))

    # Quality bonus/penalty
    quality_penalty = len(issues) * 0.08

    # Blur severity – if extremely sharp, add bonus
    blur_bonus = min(0.1, (blur - th["blur_min"]) / 500) if blur > th["blur_min"] else 0.0

    confidence = max(0.0, min(1.0,
        th["doc_confidence_base"] * (1 if is_car_document else 0)
        + kw_score * 0.4
        + blur_bonus
        - quality_penalty
        + (0.05 if pos_hits >= 3 else 0)
    ))

    if not is_car_document:
        confidence = max(0.0, confidence - 0.3)

    confidence = round(confidence, 3)

    elapsed = round(time.time() - t0, 3)

    return {
        "is_car_document": is_car_document,
        "clarity":         clarity,
        "confidence":      confidence,
        "issues":          issues,
        # Debug / audit data (remove in production if desired)
        "_debug": {
            "blur_score":       round(blur, 2),
            "brightness_score": round(bright, 2),
            "noise_score":      round(noise, 2),
            "resolution_px":    res_px,
            "ocr_keyword_hits": pos_hits,
            "matched_keywords": matched_kws[:10],
            "negative_hits":    neg_hits,
            "processing_ms":    int(elapsed * 1000),
        },
    }


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "parkar-ai"})


@app.route("/analyse", methods=["POST"])
def analyse():
    """
    POST /analyse
    Content-Type: multipart/form-data
    Field:  image  (file)

    Returns JSON:
    {
        "is_car_document": bool,
        "clarity":         "clear" | "unclear",
        "confidence":      float 0-1,
        "issues":          string[]
    }
    """
    if "image" not in request.files:
        return jsonify({"error": "No 'image' field in request."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    allowed = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if file.content_type not in allowed:
        # Try to guess from extension
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in {"jpg", "jpeg", "png", "webp"}:
            return jsonify({"error": f"Unsupported file type: {file.content_type}"}), 415

    try:
        image_bytes = file.read()
        if len(image_bytes) == 0:
            return jsonify({"error": "Empty file."}), 400

        result = analyse_image(image_bytes)
        return jsonify(result), 200

    except ValueError as ve:
        logger.warning("Bad image: %s", ve)
        return jsonify({"error": str(ve)}), 422
    except Exception as e:
        logger.exception("Unexpected error during analysis")
        return jsonify({"error": "Internal analysis error.", "detail": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
