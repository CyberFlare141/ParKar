import "./ApplyParking.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { getAuthUser } from "../../auth/session";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const DOC_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const uploadItems = [
  {
    key: "vehicle_registration_certificate",
    label: "Vehicle Registration Certificate",
    accept: ".pdf,image/jpeg,image/png",
  },
  {
    key: "driving_license",
    label: "Driving License",
    accept: ".pdf,image/jpeg,image/png",
  },
  {
    key: "university_id_card",
    label: "University ID Card",
    accept: ".pdf,image/jpeg,image/png",
  },
  {
    key: "vehicle_photo",
    label: "Vehicle Photo",
    accept: "image/jpeg,image/png",
  },
];

const studySemesterOptions = Array.from({ length: 5 }, (_, yearIndex) =>
  [1, 2].map((term) => `${yearIndex + 1}.${term}`),
).flat();

const initialValues = {
  name: "",
  aust_id: "",
  study_semester: "",
  email: "",
  contact_phone: "",
  vehicle_plate: "",
  vehicle_type: "car",
  vehicle_model: "",
  vehicle_color: "",
  vehicle_brand: "",
  registration_number: "",
  notes: "",
  nda_signed: false,
};

function formatDocumentLabel(key) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAiIssue(issue) {
  if (!issue) {
    return "No issues detected";
  }

  return String(issue)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildAiModalState(aiVerification, fallbackTitle, fallbackMessage) {
  const summary = Array.isArray(aiVerification?.summary) ? aiVerification.summary : [];
  const hasManualReview = Boolean(aiVerification?.manual_review);
  const passed = Boolean(aiVerification?.passed);
  const rejected = Boolean(aiVerification?.rejected);

  let tone = "info";
  let title = fallbackTitle;
  let message = fallbackMessage;

  if (rejected) {
    tone = "error";
    title = "AI Verification Needs New Uploads";
    message = "Some documents did not pass the AI checks. Please review the flagged files and upload clearer copies.";
  } else if (passed && hasManualReview) {
    tone = "warning";
    title = "AI Check Sent To Manual Review";
    message = "Your application was submitted, but at least one document could not be checked automatically.";
  } else if (passed) {
    tone = "success";
    title = "AI Verification Passed";
    message = "Your documents were checked successfully and the application was submitted.";
  }

  return {
    open: true,
    tone,
    title,
    message,
    documents: summary.map((item) => ({
      label: formatDocumentLabel(item?.field || item?.document_type || "document"),
      clarity: item?.clarity || "unknown",
      confidence: Math.round(Number(item?.confidence || 0) * 100),
      issues: Array.isArray(item?.issues) ? item.issues : [],
      error: item?.error || "",
      isCarDocument: Boolean(item?.is_car_document),
      documentType: item?.document_type || "",
    })),
  };
}

export default function ApplyParking() {
  const [values, setValues] = useState(() => {
    const user = getAuthUser();
    return {
      ...initialValues,
      name: user?.name || "",
      aust_id: user?.university_id || "",
      email: user?.email || "",
      contact_phone: user?.phone || "",
    };
  });
  const [documents, setDocuments] = useState({});
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiModal, setAiModal] = useState({
    open: false,
    tone: "info",
    title: "",
    message: "",
    documents: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);

        const profileResponse = await client.get(ENDPOINTS.ME, { skipAuthRedirect: true });

        if (!isMounted) {
          return;
        }

        const user = profileResponse?.data?.user || {};
        setValues((prev) => ({
          ...prev,
          name: user?.name || "",
          aust_id: user?.university_id || "",
          email: user?.email || "",
          contact_phone: user?.phone || "",
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const status = error?.response?.status;
        const message =
          status === 401
            ? "Session could not be verified right now. Please login again if this continues."
            : error?.response?.data?.message ||
              "Failed to load profile data.";
        setFeedback(message);

        // Keep the form usable with cached profile when API auth verification fails.
        const cachedUser = getAuthUser();
        if (cachedUser) {
          setValues((prev) => ({
            ...prev,
            name: cachedUser?.name || prev.name,
            aust_id: cachedUser?.university_id || prev.aust_id,
            email: cachedUser?.email || prev.email,
            contact_phone: cachedUser?.phone || prev.contact_phone,
          }));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setFeedback("");
  };

  const handleFileChange = (key, file) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: file || null,
    }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setFeedback("");
  };

  const closeAiModal = () => {
    setAiModal((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const validate = () => {
    const nextErrors = {};

    [
      "name",
      "aust_id",
      "study_semester",
      "email",
      "contact_phone",
      "vehicle_plate",
      "vehicle_model",
      "vehicle_color",
      "vehicle_brand",
      "registration_number",
    ].forEach((field) => {
      if (!String(values[field] || "").trim()) {
        nextErrors[field] = "This field is required.";
      }
    });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.nda_signed) {
      nextErrors.nda_signed = "You must confirm NDA preference to continue.";
    }

    uploadItems.forEach((item) => {
      const file = documents[item.key];
      if (!file) {
        nextErrors[item.key] = "This document is required.";
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        nextErrors[item.key] = "File must be 5MB or smaller.";
        return;
      }

      const allowedMimeTypes =
        item.key === "vehicle_photo" ? IMAGE_MIME_TYPES : DOC_MIME_TYPES;
      if (!allowedMimeTypes.has(file.type)) {
        nextErrors[item.key] = "Invalid file type.";
      }
    });

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === "nda_signed") {
        formData.append(key, value ? "1" : "0");
        return;
      }
      formData.append(key, String(value));
    });

    uploadItems.forEach((item) => {
      if (documents[item.key]) {
        formData.append(`documents[${item.key}]`, documents[item.key]);
      }
    });

    try {
      setIsSubmitting(true);
      setFeedback("");

      const response = await client.post(
        ENDPOINTS.STUDENT_PARKING_APPLICATIONS,
        formData,
        {
          skipAuthRedirect: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setFeedback(response?.data?.message || "Application submitted successfully.");
      if (response?.data?.data?.ai_verification) {
        setAiModal(
          buildAiModalState(
            response.data.data.ai_verification,
            "AI Verification Complete",
            "Your upload was checked by AI.",
          ),
        );
      }
      setDocuments({});
      setErrors({});
      setValues((prev) => ({
        ...initialValues,
        name: prev.name,
        aust_id: prev.aust_id,
        study_semester: "",
        email: prev.email,
        contact_phone: prev.contact_phone,
      }));
    } catch (error) {
      const responseErrors = error?.response?.data?.errors || {};
      const nextErrors = {};
      const rejectionItems = Array.isArray(error?.response?.data?.rejections)
        ? error.response.data.rejections
        : [];

      if (error?.response?.status === 401) {
        setFeedback("Your session has expired. Please login again, then resubmit.");
        return;
      }

      Object.entries(responseErrors).forEach(([field, messages]) => {
        if (field.startsWith("documents.")) {
          const [, key] = field.split(".");
          nextErrors[key] = Array.isArray(messages) ? messages[0] : String(messages);
          return;
        }
        nextErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
      });

      rejectionItems.forEach((item) => {
        if (item?.field) {
          nextErrors[item.field] = item.reason || "This document failed AI verification.";
        }
      });

      setErrors(nextErrors);
      if (error?.response?.status === 413) {
        setFeedback("Upload is too large. Please use smaller files (total under 25MB).");
        return;
      }

      if (error?.response?.status === 422 && error?.response?.data?.ai_verification) {
        setAiModal(
          buildAiModalState(
            error.response.data.ai_verification,
            "AI Verification Complete",
            "Your upload was checked by AI.",
          ),
        );
      }

      setFeedback(
        error?.response?.data?.message || "Failed to submit application. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="apply-page">
      <div className="apply-shell">
        <div className="apply-topbar">
          <Link to="/profile" className="back-btn">
            Profile
          </Link>
        </div>
        <h1 className="apply-title">Parking Registration Form</h1>

        {feedback ? <p className="apply-feedback">{feedback}</p> : null}

        <form className="apply-form" onSubmit={handleSubmit} noValidate>
          <div className="apply-top-grid">
            <section className="apply-section">
              <h2>Applicant Information</h2>

              <div className="field-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    type="text"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    placeholder="Enter name"
                    readOnly
                  />
                  {errors.name ? <p className="field-error">{errors.name}</p> : null}
                </label>

                <label className="field">
                  <span>AUST ID</span>
                  <input
                    type="text"
                    name="aust_id"
                    value={values.aust_id}
                    onChange={handleChange}
                    placeholder="Enter AUST ID"
                    disabled={isLoading || isSubmitting}
                  />
                  {errors.aust_id ? <p className="field-error">{errors.aust_id}</p> : null}
                </label>

                <label className="field">
                  <span>Study Semester</span>
                  <select
                    name="study_semester"
                    value={values.study_semester}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
                  >
                    <option value="">Select study semester</option>
                    {studySemesterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.study_semester ? (
                    <p className="field-error">{errors.study_semester}</p>
                  ) : null}
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    readOnly
                  />
                  {errors.email ? <p className="field-error">{errors.email}</p> : null}
                </label>

                <label className="field">
                  <span>Contact Phone</span>
                  <input
                    type="text"
                    name="contact_phone"
                    value={values.contact_phone}
                    onChange={handleChange}
                    placeholder="Enter contact phone"
                    disabled={isLoading || isSubmitting}
                  />
                  {errors.contact_phone ? (
                    <p className="field-error">{errors.contact_phone}</p>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="apply-section">
              <h2>Vehicle Info</h2>

              <div className="field-grid">
                <label className="field">
                  <span>Vehicle Plate</span>
                  <input
                    type="text"
                    name="vehicle_plate"
                    value={values.vehicle_plate}
                    onChange={handleChange}
                    placeholder="Enter vehicle plate"
                    disabled={isLoading || isSubmitting}
                  />
                  {errors.vehicle_plate ? (
                    <p className="field-error">{errors.vehicle_plate}</p>
                  ) : null}
                </label>

                <label className="field">
                  <span>Vehicle Type</span>
                  <select
                    name="vehicle_type"
                    value={values.vehicle_type}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
                  >
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="field">
                  <span>Vehicle Model</span>
                  <input
                    type="text"
                    name="vehicle_model"
                    value={values.vehicle_model}
                    onChange={handleChange}
                    placeholder="Enter vehicle model"
                    disabled={isLoading || isSubmitting}
                  />
                  {errors.vehicle_model ? (
                    <p className="field-error">{errors.vehicle_model}</p>
                  ) : null}
                </label>

                <label className="field">
                  <span>Vehicle Color</span>
                  <input
                    type="text"
                    name="vehicle_color"
                    value={values.vehicle_color}
                    onChange={handleChange}
                    placeholder="Enter vehicle color"
                    disabled={isLoading || isSubmitting}
                  />
                  {errors.vehicle_color ? (
                    <p className="field-error">{errors.vehicle_color}</p>
                  ) : null}
                </label>

                <label className="field">
                  <span>Vehicle Brand</span>
                  <input
                    type="text"
                    name="vehicle_brand"
                    value={values.vehicle_brand}
                    onChange={handleChange}
                    placeholder="Enter vehicle brand"
                    disabled={isLoading || isSubmitting}
                  />
                  {errors.vehicle_brand ? (
                    <p className="field-error">{errors.vehicle_brand}</p>
                  ) : null}
                </label>

                <label className="field">
                  <span>Registration Number</span>
                  <input
                    type="text"
                    name="registration_number"
                    value={values.registration_number}
                    onChange={handleChange}
                    placeholder="Enter registration number"
                    disabled={isLoading || isSubmitting}
                  />
                  {errors.registration_number ? (
                    <p className="field-error">{errors.registration_number}</p>
                  ) : null}
                </label>

                <label className="field">
                  <span>Notes (Optional)</span>
                  <textarea
                    rows={4}
                    placeholder="Add any necessary notes"
                    name="notes"
                    value={values.notes}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
                  />
                </label>
              </div>
            </section>
          </div>

          <section className="apply-section">
            <h2>Document Uploads</h2>

            <div className="uploads-grid">
              {uploadItems.map((item) => {
                const file = documents[item.key];
                return (
                  <label key={item.key} className="upload-control">
                    <input
                      type="file"
                      accept={item.accept}
                      onChange={(event) =>
                        handleFileChange(item.key, event.target.files?.[0])
                      }
                      disabled={isLoading || isSubmitting}
                    />
                    <span>
                      {file?.name
                        ? `${item.label}: ${file.name}`
                        : `${item.label} (PDF/JPG/PNG, max 5MB)`}
                    </span>
                    {errors[item.key] ? (
                      <p className="field-error upload-error">{errors[item.key]}</p>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>

          <div className="apply-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>

            <label className="nda-row">
              <input
                type="checkbox"
                name="nda_signed"
                checked={values.nda_signed}
                onChange={handleChange}
                disabled={isLoading || isSubmitting}
              />
              <span>I want to proceed by also signing an NDA</span>
            </label>
            {errors.nda_signed ? (
              <p className="field-error">{errors.nda_signed}</p>
            ) : null}
          </div>
        </form>
      </div>

      {aiModal.open ? (
        <div className="ai-modal-overlay" onClick={closeAiModal}>
          <div
            className={`ai-modal ai-modal-${aiModal.tone}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ai-modal-header">
              <div>
                <p className="ai-modal-kicker">ParKar AI Check</p>
                <h3>{aiModal.title}</h3>
              </div>
              <button type="button" className="ai-modal-close" onClick={closeAiModal}>
                Close
              </button>
            </div>

            <p className="ai-modal-message">{aiModal.message}</p>

            <div className="ai-modal-list">
              {aiModal.documents.map((item) => (
                <article key={item.label} className="ai-modal-card">
                  <div className="ai-modal-card-top">
                    <strong>{item.label}</strong>
                    <span className={`ai-badge ai-badge-${item.clarity}`}>
                      {item.clarity}
                    </span>
                  </div>
                  <p>
                    Confidence: <strong>{item.confidence}%</strong>
                  </p>
                  {item.documentType === "registration" || item.documentType === "license" ? (
                    <p>
                      Document match:{" "}
                      <strong>{item.isCarDocument ? "Matched" : "Not matched"}</strong>
                    </p>
                  ) : null}
                  {item.error ? (
                    <p className="ai-modal-note">{item.error}</p>
                  ) : item.issues.length ? (
                    <p className="ai-modal-note">
                      Issues: {item.issues.map(formatAiIssue).join(", ")}
                    </p>
                  ) : (
                    <p className="ai-modal-note">No issues detected.</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
