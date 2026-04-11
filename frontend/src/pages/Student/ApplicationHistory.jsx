import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls from "../../components/PaginationControls";
import useClientPagination from "../../components/useClientPagination";
import {
  getCombinedStudentApplications,
  getRenewalAlertClass,
  getRenewalBadgeClass,
  getRenewalMeta,
  getUserRenewalHistoryEntries,
} from "./renewalUtils";
import "./ApplicationHistory.css";

const AUTO_REFRESH_INTERVAL_MS = 10000;

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

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

function formatLabel(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "bg-emerald-400/15 text-emerald-200 border-emerald-300/20";
  if (normalized === "rejected") return "bg-rose-400/15 text-rose-200 border-rose-300/20";
  if (normalized === "pending") return "bg-amber-400/15 text-amber-100 border-amber-300/20";
  return "bg-amber-400/15 text-amber-100 border-amber-300/20";
}

export default function ApplicationHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const loadHistory = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await client.get(ENDPOINTS.STUDENT_DASHBOARD, {
        skipAuthRedirect: true,
      });

      setHistory(response?.data?.data || null);
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "Failed to load your application history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(false);

    const intervalId = window.setInterval(() => {
      loadHistory(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      loadHistory(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadHistory]);

  const applications = useMemo(() => history?.application_history || [], [history]);
  const student = history?.student || {};
  const renewalApplications = useMemo(
    () => getUserRenewalHistoryEntries(student?.id, applications),
    [applications, student?.id],
  );
  const combinedApplications = useMemo(
    () => getCombinedStudentApplications(student?.id, applications),
    [applications, student?.id],
  );
  const overview = useMemo(() => {
    const countByStatus = (status) =>
      combinedApplications.filter(
        (application) => String(application?.status || "").toLowerCase() === status,
      ).length;

    return {
      total_applications: combinedApplications.length,
      pending_applications: countByStatus("pending"),
      approved_applications: countByStatus("approved") + countByStatus("active"),
      rejected_applications: countByStatus("rejected"),
    };
  }, [combinedApplications]);
  const filteredApplications = useMemo(() => {
    if (activeFilter === "all") {
      return combinedApplications;
    }

    return combinedApplications.filter((application) => {
      const status = String(application?.status || "").toLowerCase();

      if (activeFilter === "approved") {
        return status === "approved" || status === "active";
      }

      return status === activeFilter;
    });
  }, [activeFilter, combinedApplications]);
  const {
    currentPage,
    pageSize,
    paginatedItems: paginatedApplications,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(filteredApplications, {
    pageSize: 4,
    resetKeys: [activeFilter],
  });

  const summaryFilters = [
    {
      key: "all",
      label: "Total",
      value: overview.total_applications ?? 0,
      className: "border-white/10 bg-white/5 text-slate-400",
    },
    {
      key: "pending",
      label: "Pending",
      value: overview.pending_applications ?? 0,
      className: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    },
    {
      key: "approved",
      label: "Approved",
      value: overview.approved_applications ?? 0,
      className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
    },
    {
      key: "rejected",
      label: "Rejected",
      value: overview.rejected_applications ?? 0,
      className: "border-rose-300/20 bg-rose-400/10 text-rose-200",
    },
  ];

  useEffect(() => {
    if (!location.state?.renewalFeedback) {
      return;
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="student-history-page">
      <div className="student-history-shell">
        <section className="student-history-hero">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-teal-300">
                Live History
              </span>
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  Application history
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Your permit status refreshes automatically every 10 seconds, so approvals,
                  rejections, comments, and ticket details show up here without a manual reload.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadHistory(true)}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                to="/student/renew"
                className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/15"
              >
                Renew Application
              </Link>
              <Link
                to="/student/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            {summaryFilters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key)}
                className={`rounded-full border px-3 py-1.5 transition ${
                  activeFilter === item.key
                    ? "ring-2 ring-white/30"
                    : ""
                } ${item.className}`}
              >
                {item.label} {item.value}
              </button>
            ))}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Last updated {formatDateTime(lastUpdated)}
            </span>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {location.state?.renewalFeedback ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
            {location.state.renewalFeedback}
          </div>
        ) : null}

        <section className="student-history-panel">
          {!loading ? (
            <div className="student-history-filterbar">
              <p className="text-sm text-slate-300">
                Showing{" "}
                <span className="font-semibold text-white">
                  {activeFilter === "all"
                    ? "all applications"
                    : `${activeFilter} applications`}
                </span>
              </p>
              {activeFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className="text-sm font-semibold text-teal-300 transition hover:text-white"
                >
                  Clear filter
                </button>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            </div>
          ) : filteredApplications.length ? (
            <div className="space-y-4">
              {paginatedApplications.map((application) => (
                (() => {
                  const renewalMeta = getRenewalMeta(application, student?.id);

                  return (
                    <article key={application.id} className="student-history-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {application?.is_renewal
                              ? `Renewal Request #${application.renewal_sequence}`
                              : `Application #${application.id}`}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {application?.is_renewal
                              ? `For Application #${application.renewal_source_application_id}`
                              : application?.semester?.name || "Semester unavailable"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(application.status)}`}
                          >
                            {application.status || "unknown"}
                          </span>
                          {renewalMeta.canRenew ? (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getRenewalBadgeClass(
                                renewalMeta.renewalStatus,
                              )}`}
                            >
                              {renewalMeta.renewalStatus}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {renewalMeta.canRenew ? (
                        <div
                          className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${getRenewalAlertClass(
                            renewalMeta.alertTone,
                          )}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold uppercase tracking-[0.16em]">
                                Renewal Status
                              </p>
                              <p className="mt-2 leading-6">{renewalMeta.alertMessage}</p>
                            </div>
                            <Link
                              to={`/student/renew/${application.id}`}
                              className="rounded-full border border-current/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10"
                            >
                              Renew Application
                            </Link>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Submitted
                          </p>
                          <p className="mt-2 text-sm text-slate-200">
                            {formatDateTime(application.created_at)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Reviewed
                          </p>
                          <p className="mt-2 text-sm text-slate-200">
                            {formatDateTime(application.reviewed_at)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Expiry Date
                          </p>
                          <p className="mt-2 text-sm text-slate-200">
                            {renewalMeta.canRenew
                              ? formatDate(renewalMeta.expiresAt)
                              : "Unavailable"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Last renewed: {formatDateTime(renewalMeta.lastRenewedAt)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Vehicle
                          </p>
                          <p className="mt-2 text-sm text-slate-200">
                            {application?.vehicle
                              ? `${application.vehicle.brand} ${application.vehicle.model}`
                              : "Vehicle unavailable"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Plate: {application?.vehicle?.plate_number || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Admin Comment
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">
                          {application?.admin_comment || "No admin comment added yet."}
                        </p>
                      </div>

                      {application?.documents?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {application.documents.map((document) => (
                            <span
                              key={document.id}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-slate-300"
                            >
                              {formatLabel(document.document_type)}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Created {formatDate(application.created_at)}
                      </p>
                    </article>
                  );
                })()
              ))}
              <PaginationControls
                currentPage={currentPage}
                itemLabel="applications"
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
              />
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
              No applications match the selected filter.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
