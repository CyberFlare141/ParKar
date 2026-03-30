import "./ApplyParking.css";
import { useEffect, useMemo, useState } from "react";
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

const initialValues = {
  name: "",
  aust_id: "",
  semester_id: "",
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

function formatSemesterLabel(semester) {
  const name = String(
    semester?.name ||
      semester?.title ||
      semester?.semester_name ||
      semester?.label ||
      "",
  ).trim();

  if (name) {
    return name;
  }

  const startDate = String(semester?.start_date || "").trim();
  const endDate = String(semester?.end_date || "").trim();

  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }

  return `Semester ${semester?.id ?? ""}`.trim();
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
  const [semesters, setSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAvailableSemesters, setHasAvailableSemesters] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);

        const [profileResponse, semesterResponse] = await Promise.all([
          client.get(ENDPOINTS.ME, { skipAuthRedirect: true }),
          client.get(ENDPOINTS.STUDENT_SEMESTERS, { skipAuthRedirect: true }),
        ]);

        if (!isMounted) {
          return;
        }

        const user = profileResponse?.data?.user || {};
        const nextSemesters = semesterResponse?.data?.data || [];
        const hasSemesters = nextSemesters.length > 0;

        setHasAvailableSemesters(hasSemesters);
        setSemesters(nextSemesters);
        setValues((prev) => ({
          ...prev,
          name: user?.name || "",
          aust_id: user?.university_id || "",
          email: user?.email || "",
          contact_phone: user?.phone || "",
          semester_id: hasSemesters && nextSemesters[0]?.id
            ? String(nextSemesters[0].id)
            : "",
        }));

        if (!hasSemesters) {
          setFeedback(
            "No active semesters are available yet. Run the semester seeder or add an active semester first.",
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const status = error?.response?.status;
        const message =
          status === 401
            ? "Session could not be verified right now. Please login again if this continues."
            : error?.response?.data?.message ||
              "Failed to load profile and semester data.";
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

        setHasAvailableSemesters(false);
        setSemesters([]);
        setValues((prev) => ({
          ...prev,
          semester_id: "",
        }));
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

  const semesterOptions = useMemo(
    () =>
      semesters.map((semester) => ({
        value: String(semester.id),
        label: formatSemesterLabel(semester),
      })),
    [semesters],
  );

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

  const validate = () => {
    const nextErrors = {};

    [
      "name",
      "aust_id",
      "semester_id",
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

    if (!hasAvailableSemesters) {
      setErrors((prev) => ({
        ...prev,
        semester_id: "No valid semester is available right now.",
      }));
      setFeedback(
        "No active semester exists in the database yet. Please seed semesters or create one before submitting.",
      );
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
      setDocuments({});
      setErrors({});
      setValues((prev) => ({
        ...initialValues,
        name: prev.name,
        aust_id: prev.aust_id,
        email: prev.email,
        contact_phone: prev.contact_phone,
        semester_id: prev.semester_id,
      }));
    } catch (error) {
      const responseErrors = error?.response?.data?.errors || {};
      const nextErrors = {};

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

      setErrors((prev) => ({ ...prev, ...nextErrors }));
      if (error?.response?.status === 413) {
        setFeedback("Upload is too large. Please use smaller files (total under 25MB).");
        return;
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
                    disabled
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
                    disabled
                  />
                  {errors.aust_id ? <p className="field-error">{errors.aust_id}</p> : null}
                </label>

                <label className="field">
                  <span>Semester</span>
                  <select
                    name="semester_id"
                    value={values.semester_id}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting || !hasAvailableSemesters}
                  >
                    <option value="">Select semester</option>
                    {semesterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.semester_id ? (
                    <p className="field-error">{errors.semester_id}</p>
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
                    disabled
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
                    disabled
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
    </div>
  );
}
