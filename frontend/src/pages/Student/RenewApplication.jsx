import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { clearAuthSession, getAuthUser } from "../../auth/session";
import {
  getRenewalBadgeClass,
  getRenewalMeta,
} from "./renewalUtils";
import "./RenewApplication.css";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const renewalUploadItems = [
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
    accept: ".pdf,image/jpeg,image/png",
  },
];

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function formatLabel(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function findApplicationById(payload, applicationId) {
  const candidates = [
    ...(payload?.application_history || []),
    ...(payload?.recent_applications || []),
    ...(payload?.latest_application ? [payload.latest_application] : []),
  ];

  return (
    candidates.find((application) => String(application?.id) === String(applicationId)) ||
    null
  );
}

function NavigationPill({ to, label, onClick }) {
  const commonClassName =
    "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200";

  if (to) {
    return (
      <Link to={to} className={commonClassName}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={commonClassName}>
      {label}
    </button>
  );
}

export default function RenewApplication() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const role = String(authUser?.role || "student").toLowerCase();
  const isTeacher = role === "teacher";
  const dashboardEndpoint = isTeacher ? ENDPOINTS.TEACHER_DASHBOARD : ENDPOINTS.STUDENT_DASHBOARD;
  const dashboardPath = isTeacher ? "/teacher/dashboard" : "/student/dashboard";
  const applicationsPath = isTeacher ? "/teacher/dashboard" : "/student/history";
  const renewalEndpoint = isTeacher
    ? ENDPOINTS.TEACHER_RENEW_PARKING_APPLICATION
    : ENDPOINTS.STUDENT_RENEW_PARKING_APPLICATION;
  const renewLabel = isTeacher ? "Faculty Renewal" : "Student Renewal";
  const renewTitle = isTeacher ? "Renew Faculty Application" : "Renew Application";
  const [application, setApplication] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [step, setStep] = useState(1);
  const [documentMode, setDocumentMode] = useState("keep");
  const [replaceFiles, setReplaceFiles] = useState({});
  const [addFiles, setAddFiles] = useState({});
  const [reviewNote, setReviewNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadApplication() {
      try {
        setLoading(true);
        setError("");

        const response = await client.get(dashboardEndpoint, {
          skipAuthRedirect: true,
        });
        const payload = response?.data?.data || null;
        const matchedApplication = findApplicationById(payload, applicationId);

        if (!isMounted) {
          return;
        }

        setDashboard(payload);
        setApplication(matchedApplication);

        if (!matchedApplication) {
          setError("The selected application could not be found for renewal.");
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError?.response?.data?.message ||
              "Failed to load application details for renewal.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadApplication();

    return () => {
      isMounted = false;
    };
  }, [applicationId, dashboardEndpoint]);

  const renewalMeta = useMemo(
    () => getRenewalMeta(application, authUser?.id),
    [application, authUser?.id],
  );

  const applicant = dashboard?.student || authUser || {};
  const existingDocuments = application?.documents || dashboard?.documents || [];
  const newValidityDate = useMemo(() => {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 6);
    return nextDate.toISOString();
  }, []);

  const validationErrors = useMemo(() => {
    const nextErrors = {};

    if (!acknowledged) {
      nextErrors.acknowledged = "Please confirm the renewal summary before submitting.";
    }

    if (documentMode === "update") {
      const changedEntries = Object.values(replaceFiles).filter(Boolean);
      if (!changedEntries.length) {
        nextErrors.replaceFiles =
          "Upload at least one replacement document or switch to keeping existing files.";
      }
    }

    if (documentMode === "add") {
      const addedEntries = Object.values(addFiles).filter(Boolean);
      if (!addedEntries.length) {
        nextErrors.addFiles = "Add at least one supporting document before continuing.";
      }
    }

    [...Object.entries(replaceFiles), ...Object.entries(addFiles)].forEach(([key, file]) => {
      if (!file) {
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        nextErrors[key] = "File must be 5MB or smaller.";
        return;
      }

      if (!ALLOWED_FILE_TYPES.has(file.type)) {
        nextErrors[key] = "Only PDF, JPG, or PNG files are allowed.";
      }
    });

    return nextErrors;
  }, [acknowledged, addFiles, documentMode, replaceFiles]);

  const handleFileChange = (setter) => (key, file) => {
    setter((current) => ({
      ...current,
      [key]: file || null,
    }));
    setFeedback("");
  };

  const goToStep = (nextStep) => {
    setStep(nextStep);
    setFeedback("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!application || !renewalMeta.canRenew) {
      setError("This application is not eligible for renewal.");
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      setFeedback("Please fix the renewal items before submitting.");
      setStep(3);
      return;
    }

    const changedDocuments = Object.entries(replaceFiles)
      .filter(([, file]) => Boolean(file))
      .map(([key, file]) => ({
        key,
        label: formatLabel(key),
        name: file.name,
      }));

    const addedDocuments = Object.entries(addFiles)
      .filter(([, file]) => Boolean(file))
      .map(([key, file]) => ({
        key,
        label: formatLabel(key),
        name: file.name,
      }));

    try {
      setIsSubmitting(true);
      setError("");
      setFeedback("");

      const formData = new FormData();
      formData.append("document_mode", documentMode);
      formData.append("acknowledged", acknowledged ? "1" : "0");
      formData.append("review_note", reviewNote);

      [...Object.entries(replaceFiles), ...Object.entries(addFiles)].forEach(([key, file]) => {
        if (file) {
          formData.append(`documents[${key}]`, file);
        }
      });

      const response = await client.post(renewalEndpoint(application.id), formData, {
        skipAuthRedirect: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      navigate(applicationsPath, {
        replace: true,
        state: {
          renewalFeedback:
            response?.data?.message ||
            `Application #${application.id} renewal submitted successfully.`,
        },
      });
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message || "Failed to submit renewal. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="student-renew-page">
      <div className="student-renew-shell">
        <section className="student-renew-hero">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-teal-300">
                {renewLabel}
              </span>
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  {renewTitle}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Review your current permit details, keep existing documents if nothing has
                  changed, or update only the files that need attention before confirming a
                  fresh 6-month validity period.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <NavigationPill to={dashboardPath} label="Dashboard" />
              <NavigationPill to="/profile" label="Profile" />
              <NavigationPill to={applicationsPath} label="Applications" />
              <NavigationPill
                label="Logout"
                onClick={() => {
                  clearAuthSession();
                  navigate("/logout");
                }}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[1, 2, 3].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => goToStep(item)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                  step === item
                    ? "bg-teal-400 text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {item === 1 && "1. Review Existing Info"}
                {item === 2 && "2. Update Documents"}
                {item === 3 && "3. Confirm Renewal"}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {feedback ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            {feedback}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6">
            <div className="space-y-4">
              <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
            </div>
          </section>
        ) : application ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <section className="student-renew-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                    Renewal Snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Application #{application.id}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getRenewalBadgeClass(
                    renewalMeta.renewalStatus,
                  )}`}
                >
                  {renewalMeta.renewalStatus}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Valid From
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDate(renewalMeta.referenceDate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Expiry Date
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDate(renewalMeta.expiresAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Renewal Count
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {renewalMeta.renewalCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Last Renewed
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDateTime(renewalMeta.lastRenewedAt)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <article className="student-renew-panel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                      Step 1
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Review Existing Info
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200"
                  >
                    Review
                  </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    ["Applicant", applicant?.name || "N/A"],
                    ["Email", applicant?.email || "N/A"],
                    ["University ID", applicant?.university_id || "N/A"],
                    [
                      "Vehicle",
                      application?.vehicle
                        ? `${application.vehicle.brand} ${application.vehicle.model}`
                        : "Vehicle unavailable",
                    ],
                    ["Plate Number", application?.vehicle?.plate_number || "N/A"],
                    ["Semester", application?.semester?.name || "Unavailable"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/8 bg-white/5 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-sm text-slate-200">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Existing Documents
                  </p>
                  <div className="mt-4 space-y-3">
                    {existingDocuments.length ? (
                      existingDocuments.map((document) => (
                        <div
                          key={document.id || document.document_type}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#0b0d10] px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {formatLabel(document.document_type)}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                              Uploaded {formatDate(document.created_at)}
                            </p>
                          </div>
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                            {document.is_verified ? "Verified" : "Available"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                        No document records are available from the current student payload.
                      </div>
                    )}
                  </div>
                </div>
              </article>

              <article className="student-renew-panel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                      Step 2
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Optional Document Update
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200"
                  >
                    Edit
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    [
                      "keep",
                      "Keep Existing Documents",
                      "Confirm renewal with the documents already on file.",
                    ],
                    [
                      "update",
                      "Update Documents",
                      "Replace only the files that changed during the last 6 months.",
                    ],
                    [
                      "add",
                      "Add New Document",
                      "Attach extra supporting files while keeping the existing set.",
                    ],
                  ].map(([value, label, description]) => (
                    <label
                      key={value}
                      className={`block rounded-2xl border px-4 py-4 transition ${
                        documentMode === value
                          ? "border-teal-300/40 bg-teal-400/10"
                          : "border-white/8 bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="documentMode"
                          value={value}
                          checked={documentMode === value}
                          onChange={(event) => setDocumentMode(event.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-semibold text-white">{label}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {description}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {documentMode === "update" ? (
                  <div className="mt-5 space-y-3">
                    {renewalUploadItems.map((item) => (
                      <label
                        key={item.key}
                        className="block rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                      >
                        <span className="block text-sm font-medium text-white">
                          {item.label}
                        </span>
                        <input
                          type="file"
                          accept={item.accept}
                          onChange={(event) =>
                            handleFileChange(setReplaceFiles)(
                              item.key,
                              event.target.files?.[0],
                            )
                          }
                          className="mt-3 block w-full text-sm text-slate-300"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {replaceFiles[item.key]?.name || "Upload only if this file changed."}
                        </p>
                        {validationErrors[item.key] ? (
                          <p className="mt-2 text-sm text-rose-300">
                            {validationErrors[item.key]}
                          </p>
                        ) : null}
                      </label>
                    ))}
                    {validationErrors.replaceFiles ? (
                      <p className="text-sm text-rose-300">{validationErrors.replaceFiles}</p>
                    ) : null}
                  </div>
                ) : null}

                {documentMode === "add" ? (
                  <div className="mt-5 space-y-3">
                    {renewalUploadItems.map((item) => (
                      <label
                        key={item.key}
                        className="block rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                      >
                        <span className="block text-sm font-medium text-white">
                          {item.label}
                        </span>
                        <input
                          type="file"
                          accept={item.accept}
                          onChange={(event) =>
                            handleFileChange(setAddFiles)(item.key, event.target.files?.[0])
                          }
                          className="mt-3 block w-full text-sm text-slate-300"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {addFiles[item.key]?.name || "Optional supporting upload."}
                        </p>
                        {validationErrors[item.key] ? (
                          <p className="mt-2 text-sm text-rose-300">
                            {validationErrors[item.key]}
                          </p>
                        ) : null}
                      </label>
                    ))}
                    {validationErrors.addFiles ? (
                      <p className="text-sm text-rose-300">{validationErrors.addFiles}</p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            </section>

            <section className="student-renew-panel">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                    Step 3
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Confirm Renewal
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200"
                >
                  Confirm
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Renewal Summary
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <p>
                      Document option:{" "}
                      <span className="font-medium text-white">
                        {formatLabel(documentMode)}
                      </span>
                    </p>
                    <p>
                      Current validity ends on{" "}
                      <span className="font-medium text-white">
                        {formatDate(renewalMeta.expiresAt)}
                      </span>
                    </p>
                    <p>
                      New validity will run until{" "}
                      <span className="font-medium text-white">
                        {formatDate(newValidityDate)}
                      </span>
                    </p>
                    <p>
                      Changed files:{" "}
                      <span className="font-medium text-white">
                        {Object.values(replaceFiles).filter(Boolean).length}
                      </span>
                    </p>
                    <p>
                      Added files:{" "}
                      <span className="font-medium text-white">
                        {Object.values(addFiles).filter(Boolean).length}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-[#0b0d10] p-4">
                  <label className="flex items-start gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      I confirm that the existing information is still valid and that only
                      the files I changed or added should need extra review.
                    </span>
                  </label>
                  {validationErrors.acknowledged ? (
                    <p className="mt-3 text-sm text-rose-300">
                      {validationErrors.acknowledged}
                    </p>
                  ) : null}

                  <label className="mt-5 block">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Renewal Note
                    </span>
                    <textarea
                      rows={4}
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Optional note about what changed during renewal."
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/40"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goToStep(Math.max(1, step - 1))}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
                >
                  Previous Step
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => goToStep(Math.min(3, step + 1))}
                    className="rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Renewing..." : "Confirm Renewal"}
                  </button>
                )}
              </div>
            </section>
          </form>
        ) : null}
      </div>
    </div>
  );
}
