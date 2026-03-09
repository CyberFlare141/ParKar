import { useCallback, useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import "./ReviewApplications.css";

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected"];

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

  const queryParams = useMemo(() => {
    const params = {
      per_page: 100,
    };
    if (statusFilter !== "all") {
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

  const updateApplicationInList = (updatedApplication) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updatedApplication.id ? updatedApplication : app)),
    );
  };

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

      const updatedApplication = response?.data?.data;
      if (updatedApplication) {
        updateApplicationInList(updatedApplication);
      }

      setMessage(response?.data?.message || "Application updated.");
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

      const response = await client.get(document.view_url, {
        responseType: "blob",
        skipAuthRedirect: true,
      });

      const blob = response?.data;
      const fileUrl = URL.createObjectURL(blob);
      setPreview((prev) => ({
        ...prev,
        loading: false,
        fileUrl,
        mimeType: blob?.type || "",
      }));
    } catch (previewError) {
      setPreview((prev) => ({
        ...prev,
        loading: false,
        error:
          previewError?.response?.data?.message ||
          "Failed to load document preview.",
      }));
    }
  };

  return (
    <div className="admin-review-page">
      <div className="admin-review-shell">
        <header className="admin-review-header">
          <h1>Application Management</h1>
          <p>Review and manage all teacher and student parking applications.</p>
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

              {!loading && applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    No applications found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? applications.map((application) => (
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
                        <span className={statusClass(application?.status)}>
                          {capitalize(application?.status)}
                        </span>
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

        {applications.map((application) => {
          if (application.id !== expandedId) return null;

          const isPending = application.status === "pending";
          return (
            <section className="application-detail" key={`detail-${application.id}`}>
              <h2>Application #{application.id}</h2>
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
