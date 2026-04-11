import { useCallback, useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls, { useClientPagination } from "../../components/PaginationControls";
import "./ReviewApplications.css";

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected", "renewal"];
const AUTO_REFRESH_INTERVAL_MS = 10000;

function toLocalDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "app-status app-status-approved";
  if (normalized === "rejected") return "app-status app-status-rejected";
  return "app-status app-status-pending";
}

function capitalize(value) {
  const raw = String(value || "").toLowerCase();
  return raw ? `${raw[0].toUpperCase()}${raw.slice(1)}` : "Unknown";
}

function isRenewalApplication(application) {
  return Boolean(
    application?.is_renewal ||
      application?.renewal_source_application_id ||
      application?.renewal_sequence ||
      String(application?.application_type || "").toLowerCase() === "renewal" ||
      String(application?.request_type || "").toLowerCase() === "renewal",
  );
}

function resolveApiDocumentUrl(url, fallbackPath = "") {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) {
    return fallbackPath;
  }

  if (rawUrl.startsWith("/")) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallbackPath || rawUrl;
  }
}

function getDocumentPreviewCandidates(document) {
  const candidates = [
    document?.id ? ENDPOINTS.ADMIN_VIEW_DOCUMENT(document.id) : "",
    resolveApiDocumentUrl(document?.view_url, ""),
    resolveApiDocumentUrl(document?.download_url, ""),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return [...new Set(candidates)];
}

async function getBlobErrorMessage(error) {
  const fallbackMessage = "Failed to load document preview.";
  const responseData = error?.response?.data;

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);
      return parsed?.message || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }

  return error?.response?.data?.message || fallbackMessage;
}

export default function ReviewApplications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reviewForm, setReviewForm] = useState({
    applicationId: null,
    admin_comment: "",
    parking_slot: "",
  });
  const [preview, setPreview] = useState({
    open: false,
    loading: false,
    error: "",
    fileUrl: "",
    mimeType: "",
    fileName: "",
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  const queryParams = useMemo(() => {
    const params = {
      per_page: 100,
    };
    if (statusFilter !== "all" && statusFilter !== "renewal") {
      params.status = statusFilter;
    }
    if (searchText.trim()) {
      params.search = searchText.trim();
    }
    return params;
  }, [searchText, statusFilter]);

  const loadApplications = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");
        setMessage("");
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await client.get(ENDPOINTS.ADMIN_PARKING_APPLICATIONS, {
          params: queryParams,
          skipAuthRedirect: true,
        });
        const items = Array.isArray(response?.data?.data) ? response.data.data : [];
        setApplications(items);
        setLastUpdated(new Date().toISOString());
      } catch (loadError) {
        setError(
          loadError?.response?.data?.message ||
            "Failed to load parking applications.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryParams],
  );

  useEffect(() => {
    loadApplications(false);
  }, [loadApplications]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadApplications(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      loadApplications(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadApplications]);

  useEffect(() => {
    return () => {
      if (preview.fileUrl) {
        URL.revokeObjectURL(preview.fileUrl);
      }
    };
  }, [preview.fileUrl]);

  const handleExpand = (application) => {
    const nextExpanded = expandedId === application.id ? null : application.id;
    setExpandedId(nextExpanded);
    if (nextExpanded) {
      setReviewForm({
        applicationId: application.id,
        admin_comment: "",
        parking_slot: "",
      });
    }
  };

  const pendingCount = applications.filter((application) => application?.status === "pending").length;
  const approvedCount = applications.filter((application) => application?.status === "approved").length;
  const rejectedCount = applications.filter((application) => application?.status === "rejected").length;
  const renewalCount = applications.filter((application) => isRenewalApplication(application)).length;
  const visibleApplications =
    statusFilter === "renewal"
      ? applications.filter((application) => isRenewalApplication(application))
      : applications;
  const {
    currentPage,
    pageSize,
    paginatedItems: paginatedApplications,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(visibleApplications, {
    pageSize: 10,
    resetKeys: [statusFilter, searchText],
  });
  const summaryChips = [
    {
      key: "all",
      label: "Showing",
      value: applications.length,
      className: "admin-review-chip",
    },
    {
      key: "pending",
      label: "Pending",
      value: pendingCount,
      className: "admin-review-chip admin-review-chip-pending",
    },
    {
      key: "approved",
      label: "Approved",
      value: approvedCount,
      className: "admin-review-chip admin-review-chip-approved",
    },
    {
      key: "rejected",
      label: "Rejected",
      value: rejectedCount,
      className: "admin-review-chip admin-review-chip-rejected",
    },
    {
      key: "renewal",
      label: "Renewal",
      value: renewalCount,
      className: "admin-review-chip admin-review-chip-renewal",
    },
  ];

  const handleReviewAction = async (application, nextStatus) => {
    if (!application?.id) return;
    if (application.status !== "pending") return;

    const payload = {
      status: nextStatus,
      admin_comment: reviewForm.admin_comment.trim() || null,
      parking_slot: nextStatus === "approved" ? reviewForm.parking_slot.trim() || null : null,
    };

    if (nextStatus === "rejected" && !payload.admin_comment) {
      setError("Comment is required when rejecting an application.");
      return;
    }

    try {
      setRefreshing(true);
      setError("");
      setMessage("");

      const response = await client.patch(
        ENDPOINTS.ADMIN_REVIEW_APPLICATION(application.id),
        payload,
        { skipAuthRedirect: true },
      );

      setMessage(response?.data?.message || "Application updated.");
      setExpandedId(application.id);
      await loadApplications(true);
    } catch (reviewError) {
      setError(
        reviewError?.response?.data?.message || "Failed to update application status.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const closePreview = () => {
    setPreview((prev) => {
      if (prev.fileUrl) {
        URL.revokeObjectURL(prev.fileUrl);
      }
      return {
        open: false,
        loading: false,
        error: "",
        fileUrl: "",
        mimeType: "",
        fileName: "",
      };
    });
  };

  const handleViewDocument = async (document) => {
    const previewCandidates = getDocumentPreviewCandidates(document);

    if (!previewCandidates.length) {
      setPreview((prev) => ({
        ...prev,
        open: true,
        loading: false,
        error: "No document preview route is available for this file.",
        fileUrl: "",
        mimeType: "",
        fileName: String(document?.file_path || "").split("/").pop() || "document",
      }));
      return;
    }

    try {
      setError("");
      setMessage("");
      setPreview((prev) => {
        if (prev.fileUrl) {
          URL.revokeObjectURL(prev.fileUrl);
        }
        return {
          open: true,
          loading: true,
          error: "",
          fileUrl: "",
          mimeType: "",
          fileName: String(document?.file_path || "").split("/").pop() || "document",
        };
      });

      let blob = null;
      let lastPreviewError = null;

      for (const previewUrl of previewCandidates) {
        try {
          const response = await client.get(previewUrl, {
            responseType: "blob",
            skipAuthRedirect: true,
          });

          blob = response?.data || null;
          if (blob) {
            break;
          }
        } catch (requestError) {
          lastPreviewError = requestError;
        }
      }

      if (!blob) {
        throw lastPreviewError || new Error("Failed to load document preview.");
      }

      const fileUrl = URL.createObjectURL(blob);
      setPreview((prev) => ({
        ...prev,
        loading: false,
        fileUrl,
        mimeType: blob?.type || "",
      }));
    } catch (previewError) {
      const errorMessage = await getBlobErrorMessage(previewError);
      setPreview((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  return (
    <div className="admin-review-page">
      <div className="admin-review-shell">
        <header className="admin-review-header">
          <h1>Application Management</h1>
          <p>
            Review and manage all teacher and student parking applications.
            New submissions refresh automatically every 10 seconds.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
            {summaryChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatusFilter(chip.key)}
                className={`${chip.className} ${
                  statusFilter === chip.key ? "admin-review-chip-active" : ""
                }`}
              >
                {chip.label} {chip.value}
              </button>
            ))}
            <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5">
              Last updated {toLocalDateTime(lastUpdated)}
            </span>
          </div>
        </header>

        <section className="admin-review-toolbar">
          <input
            type="search"
            placeholder="Search by applicant, ID, email, or plate number"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {capitalize(option)}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => loadApplications(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {statusFilter !== "all" ? (
          <div className="admin-review-filterbar">
            <p>
              Showing{" "}
              <strong>
                {statusFilter === "renewal" ? "renewal applications" : `${statusFilter} applications`}
              </strong>
            </p>
            <button type="button" onClick={() => setStatusFilter("all")}>
              Clear filter
            </button>
          </div>
        ) : null}

        {message ? <p className="admin-review-message success">{message}</p> : null}
        {error ? <p className="admin-review-message error">{error}</p> : null}

        <section className="admin-review-table-wrap">
          <table className="admin-review-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Role</th>
                <th>ID Number</th>
                <th>Vehicle</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    Loading applications...
                  </td>
                </tr>
              ) : null}

              {!loading && visibleApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    {statusFilter === "renewal"
                      ? "No renewal applications found."
                      : "No applications found."}
                  </td>
                </tr>
              ) : null}

              {!loading
                ? paginatedApplications.map((application) => (
                    <tr key={application.id}>
                      <td>{application?.applicant?.name || "N/A"}</td>
                      <td>{capitalize(application?.applicant?.role)}</td>
                      <td>{application?.applicant?.university_id || "N/A"}</td>
                      <td>
                        {application?.vehicle?.brand || "N/A"} {application?.vehicle?.model || ""}
                        <br />
                        <span className="muted">
                          Plate: {application?.vehicle?.plate_number || "N/A"}
                        </span>
                      </td>
                      <td>{toLocalDateTime(application?.created_at)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <span className={statusClass(application?.status)}>
                            {capitalize(application?.status)}
                          </span>
                          {isRenewalApplication(application) ? (
                            <span className="app-status app-status-renewal">Renewal</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="detail-btn"
                          onClick={() => handleExpand(application)}
                        >
                          {expandedId === application.id ? "Hide" : "Review"}
                        </button>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </section>
        {!loading && visibleApplications.length ? (
          <PaginationControls
            className="border-slate-800/80 bg-slate-950/50"
            currentPage={currentPage}
            itemLabel="applications"
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        ) : null}

        {visibleApplications.map((application) => {
          if (application.id !== expandedId) return null;

          const isPending = application.status === "pending";
          return (
            <section className="application-detail" key={`detail-${application.id}`}>
              <h2>
                {isRenewalApplication(application)
                  ? `Renewal Request #${application.id}`
                  : `Application #${application.id}`}
              </h2>
              {isRenewalApplication(application) && application?.renewal_source_application_id ? (
                <p>
                  <strong>Renewal For:</strong> Application #
                  {application.renewal_source_application_id}
                </p>
              ) : null}
              <p>
                <strong>Applicant:</strong> {application?.applicant?.name || "N/A"} (
                {capitalize(application?.applicant?.role)})
              </p>
              <p>
                <strong>Email:</strong> {application?.applicant?.email || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {application?.applicant?.phone || "N/A"}
              </p>
              <p>
                <strong>University ID:</strong>{" "}
                {application?.applicant?.university_id || "N/A"}
              </p>
              <p>
                <strong>Vehicle:</strong> {application?.vehicle?.vehicle_type || "N/A"} /{" "}
                {application?.vehicle?.brand || "N/A"} {application?.vehicle?.model || ""},{" "}
                {application?.vehicle?.color || "N/A"}
              </p>
              <p>
                <strong>Registration Number:</strong>{" "}
                {application?.vehicle?.registration_number || "N/A"}
              </p>
              <p>
                <strong>Submitted:</strong> {toLocalDateTime(application?.created_at)}
              </p>
              <p>
                <strong>Admin Comment:</strong> {application?.admin_comment || "N/A"}
              </p>
              {application?.ticket ? (
                <p>
                  <strong>Ticket:</strong> {application.ticket.ticket_id} | Issued{" "}
                  {toLocalDateTime(application.ticket.issue_date)} | Slot:{" "}
                  {application.ticket.parking_slot || "Not assigned"}
                </p>
              ) : null}

              <div className="doc-list">
                <strong>Uploaded Documents:</strong>
                {application?.documents?.length ? (
                  <ul>
                    {application.documents.map((document) => (
                      <li key={document.id}>
                        {capitalize(document.document_type)}:{" "}
                        <button
                          type="button"
                          className="doc-view-btn"
                          onClick={() => handleViewDocument(document)}
                        >
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No documents available.</p>
                )}
              </div>

              {isPending ? (
                <div className="review-actions">
                  <textarea
                    value={reviewForm.applicationId === application.id ? reviewForm.admin_comment : ""}
                    onChange={(event) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        applicationId: application.id,
                        admin_comment: event.target.value,
                      }))
                    }
                    placeholder="Admin comment (required for rejection)"
                    rows={3}
                  />
                  <input
                    type="text"
                    value={reviewForm.applicationId === application.id ? reviewForm.parking_slot : ""}
                    onChange={(event) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        applicationId: application.id,
                        parking_slot: event.target.value,
                      }))
                    }
                    placeholder="Parking slot (optional for approval)"
                  />
                  <div className="review-buttons">
                    <button
                      type="button"
                      className="approve-btn"
                      onClick={() => handleReviewAction(application, "approved")}
                      disabled={refreshing}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="reject-btn"
                      onClick={() => handleReviewAction(application, "rejected")}
                      disabled={refreshing}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted">
                  This application has already been reviewed and cannot be changed.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {preview.open ? (
        <div className="doc-modal-overlay" onClick={closePreview}>
          <div className="doc-modal" onClick={(event) => event.stopPropagation()}>
            <div className="doc-modal-header">
              <h3>Document Preview</h3>
              <button type="button" className="doc-close-btn" onClick={closePreview}>
                Close
              </button>
            </div>

            {preview.loading ? <p>Loading document...</p> : null}
            {preview.error ? <p className="admin-review-message error">{preview.error}</p> : null}

            {!preview.loading && !preview.error && preview.fileUrl ? (
              <div className="doc-modal-body">
                {preview.mimeType.startsWith("image/") ? (
                  <img src={preview.fileUrl} alt={preview.fileName} className="doc-image" />
                ) : preview.mimeType === "application/pdf" ? (
                  <iframe
                    src={preview.fileUrl}
                    title={preview.fileName}
                    className="doc-pdf-frame"
                  />
                ) : (
                  <a href={preview.fileUrl} target="_blank" rel="noreferrer">
                    Open document in new tab
                  </a>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
