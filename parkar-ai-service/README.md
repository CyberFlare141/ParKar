# ParKar – AI Document Verification Service

A **100% free, open-source** AI microservice that plugs into the ParKar Laravel backend and automatically verifies uploaded car documents.

---

## Architecture Overview

```
Mobile/Web Client
      │  POST /api/student/parking-applications
      │  (multipart/form-data with document files)
      ▼
┌─────────────────────────────────┐
│     Laravel (ParKar API)        │
│  StudentParkingApplicationCtrl  │
│     AiDocumentService           │──── HTTP POST /analyse ──►┐
└─────────────────────────────────┘                           │
                                                              ▼
                                              ┌───────────────────────────┐
                                              │  Python AI Microservice   │
                                              │  (Flask + OpenCV +        │
                                              │   Tesseract OCR)          │
                                              └───────────────────────────┘
                                                   Returns JSON:
                                                   {
                                                     is_car_document: bool,
                                                     clarity: "clear"|"unclear",
                                                     confidence: 0-1,
                                                     issues: string[]
                                                   }
```

---

## What the AI Checks

### 1. Document Detection
Uses **Tesseract OCR** to extract text, then matches against a curated vocabulary of car-document terms:

| Category | Keywords |
|----------|----------|
| Registration | `registration`, `certificate`, `chassis`, `engine no`, `owner` |
| License | `license`, `driving`, `permit`, `expiry`, `date of birth` |
| Insurance | `insurance`, `policy`, `premium`, `coverage`, `insurer` |

Rejects if negative keywords are found (`selfie`, `facebook`, `menu`, etc.)

### 2. Image Quality
Uses **OpenCV** to measure:

| Check | Method | Threshold |
|-------|--------|-----------|
| Blurriness | Laplacian variance | < 80 → blurry |
| Darkness | Mean pixel intensity | < 40 → too dark |
| Over-exposure | Mean pixel intensity | > 220 → over-exposed |
| Resolution | Width × Height | < 100,000px → low-res |
| Noise | Gaussian diff std-dev | > 35 → noisy |
| Cropping | Edge saturation check | 2+ saturated edges |

---

## Quick Start

### Option A – Docker (recommended)

```bash
# 1. Clone / copy the ai-service folder
cd parkar-ai-service

# 2. Build & run
docker build -t parkar-ai .
docker run -p 5001:5001 parkar-ai

# 3. Test
curl -X POST http://localhost:5001/analyse \
  -F "image=@/path/to/car_registration.jpg"
```

### Option B – Local Python

```bash
# System dependency (Ubuntu/Debian)
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# Python environment
cd parkar-ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run
python app.py
# → Listening on http://0.0.0.0:5001
```

### Option C – Docker Compose (full stack)

```bash
docker-compose up --build
# Laravel on :8000, AI service on :5001
```

---

## Laravel Integration

### 1. Add to `.env`

```env
AI_SERVICE_URL=http://localhost:5001
AI_SERVICE_TIMEOUT=30
```

### 2. Copy files into your Laravel project

| Source (this repo) | Destination (ParKar) |
|--------------------|----------------------|
| `laravel/app/Http/Services/Ai/AiDocumentService.php` | `app/Http/Services/Ai/AiDocumentService.php` |
| `laravel/app/Http/Controllers/StudentParkingApplicationController.php` | Replace existing controller |
| `laravel/app/Models/AiAnalysis.php` | Replace existing model |
| `laravel/database/migrations/2026_04_02_000001_extend_ai_analysis_table.php` | `database/migrations/` |

### 3. Register the service (optional – Laravel auto-discovers it)

Add to `config/services.php`:
```php
'ai_document' => [
    'url'     => env('AI_SERVICE_URL', 'http://localhost:5001'),
    'timeout' => (int) env('AI_SERVICE_TIMEOUT', 30),
],
```

### 4. Bind in AppServiceProvider (optional)

```php
// app/Providers/AppServiceProvider.php
use App\Http\Services\Ai\AiDocumentService;

public function register(): void
{
    $this->app->singleton(AiDocumentService::class);
}
```

### 5. Run migration

```bash
The main Laravel app no longer uses `php artisan migrate`; it imports `schema.sql` through Docker on first startup.
```

---

## API Reference

### `POST /analyse`

**Request** (multipart/form-data)

| Field | Type | Required |
|-------|------|----------|
| `image` | file (jpg/png/webp) | ✅ |

**Response 200**

```json
{
  "is_car_document": true,
  "clarity": "clear",
  "confidence": 0.73,
  "issues": [],
  "_debug": {
    "blur_score": 142.5,
    "brightness_score": 118.3,
    "noise_score": 12.7,
    "resolution_px": 786432,
    "ocr_keyword_hits": 4,
    "matched_keywords": ["registration", "certificate", "vehicle", "expiry"],
    "negative_hits": [],
    "processing_ms": 380
  }
}
```

**Response 422 – bad image**

```json
{
  "error": "Cannot decode image – unsupported format or corrupt file."
}
```

---

## Example – Laravel Rejection Response

When a document fails AI checks, Laravel returns:

```json
{
  "message": "One or more documents failed AI verification. Please re-upload clearer images.",
  "rejections": [
    {
      "field": "driving_license",
      "reason": "Image quality issues: blurry, too dark"
    }
  ]
}
```

---

## Tuning Thresholds

Edit `THRESHOLDS` at the top of `app.py`:

```python
THRESHOLDS = {
    "blur_min":              80.0,   # ↑ stricter on blur
    "brightness_min":        40.0,
    "brightness_max":        220.0,
    "resolution_min_px":     100_000,
    "noise_max":             35.0,
    "doc_keyword_hits_min":  1,      # ↑ require more keywords for stricter doc check
    "doc_confidence_base":   0.50,
}
```

---

## Extending the Service

### Add a new document type
Append keywords to `CAR_DOC_KEYWORDS` in `app.py`.

### Add a CLIP-based visual classifier (optional upgrade)
```python
# Extra free upgrade: visual document classifier using CLIP
# pip install transformers torch
from transformers import CLIPProcessor, CLIPModel

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

labels = ["car document", "selfie", "landscape", "food", "random image"]
# Use zero-shot classification to boost is_car_document confidence
```

### Expose `_debug` in production (opt-in)
Pass `?debug=1` query param and conditionally include the `_debug` block.

---

## Confidence Score Logic

```
confidence = base(0.5 if is_car_doc else 0)
           + keyword_density_score * 0.4
           + blur_bonus (up to +0.1)
           - issues_penalty (0.08 per issue)
           + bonus_if_3+_keywords (0.05)
           clamped to [0.0, 1.0]
```

---

## Stack Summary

| Component | Library | Cost |
|-----------|---------|------|
| Web framework | Flask | Free |
| Blur/quality | OpenCV | Free |
| Text extraction | Tesseract OCR | Free |
| Image I/O | Pillow | Free |
| Production server | Gunicorn | Free |
| Container | Docker | Free |
