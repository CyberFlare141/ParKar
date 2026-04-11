import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { getAuthUser } from "../auth/session";
import PaginationControls, { useClientPagination } from "../components/PaginationControls";
import { getCombinedStudentApplications, getRenewalMeta } from "./Student/renewalUtils";
import "./notifications.css";

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function getStageLabel(application) {
  const status = String(application?.status || "").toLowerCase();
  if (status === "approved" || status === "active") return "Approved";
  if (status === "rejected") return "Declined";
  return "Pending Review";
}

function buildStatusFlow(application, renewalMeta) {
  const status = String(application?.status || "").toLowerCase();

  if (status === "approved" || status === "active") {
    return [
      { label: "Submitted", state: "completed", hint: "Application received" },
      { label: "In Review", state: "completed", hint: "Checked by admin" },
      { label: "Approved", state: "current", hint: renewalMeta.renewalStatus || "Permit active" },
    ];
  }

  if (status === "rejected") {
    return [
      { label: "Submitted", state: "completed", hint: "Application received" },
      { label: "In Review", state: "completed", hint: "Checked by admin" },
      { label: "Declined", state: "current", hint: "Needs correction before resubmission" },
    ];
  }

  return [
    { label: "Submitted", state: "completed", hint: "Application received" },
    { label: "In Review", state: "current", hint: "Under admin verification" },
    { label: "Approved", state: "future", hint: "Permit will be issued" },
  ];
}

function getFilterLabel(filter) {
  if (filter === "approved") return "approved";
  if (filter === "rejected") return "rejected";
  if (filter === "pending") return "pending";
  if (filter === "renewal") return "renewal";
  return "all";
}

const updateStatusTone = {
  Submitted: "submitted",
  "Pending Review": "pending",
  Approved: "approved",
  Declined: "declined",
  "Renewal Required": "pending",
  "Renewal Submitted": "pending",
};

export default function Notifications() {
  const authUser = getAuthUser();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await client.get(ENDPOINTS.STUDENT_DASHBOARD, {
          skipAuthRedirect: true,
        });

        if (isMounted) {
          setDashboard(response?.data?.data || null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError?.response?.data?.message ||
              "Failed to load notification activity.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const applications = useMemo(
    () => getCombinedStudentApplications(authUser?.id, dashboard?.application_history || []),
    [authUser?.id, dashboard?.application_history],
  );
  const summary = useMemo(() => {
    const countByStatus = (status) =>
      applications.filter(
        (application) => String(application?.status || "").toLowerCase() === status,
      ).length;

    return {
      total: applications.length,
      pending: countByStatus("pending"),
      approved: countByStatus("approved") + countByStatus("active"),
      rejected: countByStatus("rejected"),
      renewal: applications.filter((application) => Boolean(application?.is_renewal)).length,
    };
  }, [applications]);
  const filteredApplications = useMemo(() => {
    if (activeFilter === "all") {
      return applications;
    }

    return applications.filter((application) => {
      const status = String(application?.status || "").toLowerCase();

      if (activeFilter === "renewal") {
        return Boolean(application?.is_renewal);
      }

      if (activeFilter === "approved") {
        return status === "approved" || status === "active";
      }

      return status === activeFilter;
    });
  }, [activeFilter, applications]);
  const currentApplication = filteredApplications[0] || applications[0] || null;
  const renewalMeta = getRenewalMeta(currentApplication, authUser?.id);
  const permissionDetails = [
    {
      label: "Owner",
      value: dashboard?.student?.name || authUser?.name || "N/A",
      updatedAt: formatDateTime(currentApplication?.created_at),
    },
    {
      label: "Plate",
      value: currentApplication?.vehicle?.plate_number || "N/A",
      updatedAt: formatDateTime(currentApplication?.created_at),
    },
    {
      label: "Role",
      value: authUser?.role ? String(authUser.role) : "Student",
      updatedAt: formatDateTime(currentApplication?.created_at),
    },
  ];
  const latestUpdates = filteredApplications.map((application) => ({
    status: application?.is_renewal ? "Renewal Submitted" : getStageLabel(application),
    time: formatDateTime(application?.created_at),
    title: application?.is_renewal
      ? `Renewal Request #${application.renewal_sequence}`
      : `Application #${application?.id}`,
  }));
  const {
    currentPage,
    pageSize,
    paginatedItems: paginatedLatestUpdates,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(latestUpdates, {
    pageSize: 5,
    resetKeys: [activeFilter],
  });
  const statusFlow = buildStatusFlow(currentApplication, renewalMeta);
  const currentStep = statusFlow.find((step) => step.state === "current")?.label || "Unknown";
  const filterItems = [
    { key: "all", label: "All", value: summary.total, tone: "" },
    { key: "pending", label: "Pending", value: summary.pending, tone: "pending" },
    { key: "approved", label: "Approved", value: summary.approved, tone: "approved" },
    { key: "rejected", label: "Rejected", value: summary.rejected, tone: "declined" },
    { key: "renewal", label: "Renewal", value: summary.renewal, tone: "updated" },
  ];

  return (
    <div className="ntf-page">
      <main className="ntf-shell">
        <header className="ntf-top">
          <p className="ntf-eyebrow">Parking Activity Center</p>
          <h1>Notifications</h1>
          <p className="ntf-subtitle">
            Track parking permission details and stay updated on recent request activity.
          </p>
          <span className="ntf-live-pill">Live Status Feed</span>
        </header>

        {error ? <p className="profile-feedback error">{error}</p> : null}
        {loading ? <p className="profile-feedback">Loading activity...</p> : null}

        <section className="ntf-card ntf-track-card">
          <h2 className="ntf-track-title">Status</h2>
          <p className="ntf-track-subtitle">Track your parking application and renewal status</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {filterItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key)}
                className={`ntf-status ntf-status--${item.tone || "updated"}`}
                style={{
                  opacity: activeFilter === item.key ? 1 : 0.82,
                  boxShadow:
                    activeFilter === item.key ? "0 0 0 2px rgba(255,255,255,0.18)" : "none",
                }}
              >
                <span className="ntf-chip-dot" aria-hidden="true" />
                {item.label} {item.value}
              </button>
            ))}
          </div>
          <div className="ntf-current-banner" aria-live="polite">
            <span className="ntf-current-banner-label">
              Current Stage ({getFilterLabel(activeFilter)})
            </span>
            <strong>{currentStep}</strong>
          </div>

          <div className="ntf-track-flow" role="list" aria-label="Application status flow">
            {statusFlow.map((step, index) => (
              <div key={step.label} className={`ntf-track-item-wrap ntf-track-wrap--${step.state}`}>
                <article
                  className={`ntf-track-item ntf-track-item--${step.state}`}
                  role="listitem"
                  aria-current={step.state === "current" ? "step" : undefined}
                >
                  <span className={`ntf-track-badge ntf-track-badge--${step.state}`}>
                    {step.state === "completed"
                      ? "Completed"
                      : step.state === "current"
                        ? "Current"
                        : "Upcoming"}
                  </span>
                  <p className="ntf-track-item-label">{step.label}</p>
                  <p className="ntf-track-item-hint">{step.hint}</p>
                </article>

                {index !== statusFlow.length - 1 ? (
                  <div className="ntf-track-arrow" aria-hidden="true">
                    <span className="ntf-track-arrow-line" />
                    <span className="ntf-track-arrow-head" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="ntf-card">
          <h2 className="ntf-card-title">Permission Details</h2>

          <div className="ntf-head ntf-head-permission">
            <p>Label</p>
            <p>Value</p>
            <p>Timestamp</p>
          </div>

          <div className="ntf-rows">
            {permissionDetails.map((item) => (
              <article key={item.label} className="ntf-row ntf-row-permission">
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Label</p>
                  <p className="ntf-label-value">{item.label}</p>
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Value</p>
                  <p className="ntf-main-value">{item.value}</p>
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Timestamp</p>
                  <p className="ntf-time-value">{item.updatedAt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ntf-card ntf-card-updates">
          <h2 className="ntf-card-title">Latest Updates</h2>
          <p className="ntf-track-subtitle">
            Showing {getFilterLabel(activeFilter)} activity from your frontend application feed.
          </p>

          <div className="ntf-head ntf-head-updates">
            <p>Application</p>
            <p>Status</p>
            <p>Timestamp</p>
          </div>

          <div className="ntf-rows">
            {paginatedLatestUpdates.map((update, index) => (
              <article key={`${update.status}-${update.time}-${index}`} className="ntf-row ntf-row-updates ntf-timeline-row">
                <div className="ntf-timeline-rail" aria-hidden="true">
                  <span
                    className={`ntf-timeline-dot ntf-status--${updateStatusTone[update.status] || "updated"}`}
                  />
                  {index !== latestUpdates.length - 1 ? <span className="ntf-timeline-line" /> : null}
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Application</p>
                  <p className="ntf-main-value">{update.title}</p>
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Status</p>
                  <span className={`ntf-status ntf-status--${updateStatusTone[update.status] || "updated"}`}>
                    <span className="ntf-chip-dot" aria-hidden="true" />
                    {update.status}
                  </span>
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Timestamp</p>
                  <p className="ntf-time-value">{update.time}</p>
                </div>
              </article>
            ))}
            {!latestUpdates.length ? (
              <article className="ntf-row ntf-row-updates">
                <div className="ntf-cell">
                  <p className="ntf-main-value">No applications match this filter yet.</p>
                </div>
              </article>
            ) : null}
          </div>
          <PaginationControls
            currentPage={currentPage}
            itemLabel="updates"
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </section>
      </main>
    </div>
  );
}
