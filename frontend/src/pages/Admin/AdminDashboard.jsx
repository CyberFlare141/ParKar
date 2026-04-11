import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls, { useClientPagination } from "../../components/PaginationControls";
import "./AdminDashboard.css";

const AUTO_REFRESH_INTERVAL_MS = 10000;

function normalizeApplication(application) {
  if (!application) return null;

  return {
    id: application.id,
    status: application.status,
    created_at: application.created_at,
    reviewed_at: application.reviewed_at,
    applicant_name: application.applicant_name || application?.applicant?.name || "N/A",
    applicant_email: application.applicant_email || application?.applicant?.email || "N/A",
    applicant_phone: application.applicant_phone || application?.applicant?.phone || "N/A",
    register_as: application.register_as || application?.applicant?.role || "",
    admin_comment: application.admin_comment || null,
    semester: application.semester || null,
    vehicle: application.vehicle || null,
    ticket: application.ticket || null,
  };
}

function combineDashboardData(dashboardPayload) {
  const dashboardData = dashboardPayload?.data?.data || {};

  return {
    admin: dashboardData.admin || {},
    active_semester: dashboardData.active_semester || null,
    overview: dashboardData.overview || {},
    recent_applications: Array.isArray(dashboardData.recent_applications)
      ? dashboardData.recent_applications.map(normalizeApplication).filter(Boolean)
      : [],
    priority_queue: Array.isArray(dashboardData.priority_queue)
      ? dashboardData.priority_queue.map(normalizeApplication).filter(Boolean)
      : [],
    recent_audit_logs: Array.isArray(dashboardData.recent_audit_logs)
      ? dashboardData.recent_audit_logs
      : [],
    admin_presence: dashboardData.admin_presence || { logged_in_count: 0, window_minutes: 60, admins: [] },
  };
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

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatRole(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "pk-admin-pill-success";
  if (normalized === "rejected") return "pk-admin-pill-danger";
  return "pk-admin-pill-warning";
}

function actionTone(action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized === "approved") return "pk-admin-pill-success";
  if (normalized === "rejected") return "pk-admin-pill-danger";
  return "pk-admin-pill-neutral";
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const dashboardResponse = await client.get(ENDPOINTS.ADMIN_DASHBOARD, {
        skipAuthRedirect: true,
      });

      setDashboard(combineDashboardData(dashboardResponse));
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message || "Failed to load the admin dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const guardedLoad = async (isRefresh = false) => {
      await loadDashboard(isRefresh);
      if (!active) {
        return;
      }
    };

    guardedLoad();

    const intervalId = window.setInterval(() => {
      guardedLoad(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      guardedLoad(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadDashboard]);

  const admin = dashboard?.admin || {};
  const overview = dashboard?.overview || {};
  const activeSemester = dashboard?.active_semester;
  const recentApplications = dashboard?.recent_applications || [];
  const priorityQueue = dashboard?.priority_queue || [];
  const recentAuditLogs = dashboard?.recent_audit_logs || [];
  const adminPresence = dashboard?.admin_presence || {};
  const onlineAdmins = adminPresence.admins || [];
  const {
    currentPage: onlineAdminsPage,
    pageSize: onlineAdminsPageSize,
    paginatedItems: paginatedOnlineAdmins,
    setCurrentPage: setOnlineAdminsPage,
    totalItems: totalOnlineAdmins,
    totalPages: totalOnlineAdminsPages,
  } = useClientPagination(onlineAdmins, {
    pageSize: 4,
  });
  const {
    currentPage: queuePage,
    pageSize: queuePageSize,
    paginatedItems: paginatedPriorityQueue,
    setCurrentPage: setQueuePage,
    totalItems: totalPriorityQueueItems,
    totalPages: totalPriorityQueuePages,
  } = useClientPagination(priorityQueue, {
    pageSize: 4,
  });
  const {
    currentPage: applicationsPage,
    pageSize: applicationsPageSize,
    paginatedItems: paginatedRecentApplications,
    setCurrentPage: setApplicationsPage,
    totalItems: totalRecentApplicationItems,
    totalPages: totalRecentApplicationPages,
  } = useClientPagination(recentApplications, {
    pageSize: 6,
  });
  const {
    currentPage: auditPage,
    pageSize: auditPageSize,
    paginatedItems: paginatedAuditLogs,
    setCurrentPage: setAuditPage,
    totalItems: totalAuditItems,
    totalPages: totalAuditPages,
  } = useClientPagination(recentAuditLogs, {
    pageSize: 4,
  });

  const statCards = [
    {
      label: "Applications",
      value: overview.total_applications ?? 0,
      hint: `${overview.pending_applications ?? 0} waiting for review`,
    },
    {
      label: "Approval Rate",
      value: formatPercent(overview.approval_rate),
      hint: `${overview.approved_applications ?? 0} approved out of reviewed applications`,
    },
    {
      label: "Logged In Admins",
      value: overview.logged_in_admins ?? 0,
      hint: `Active within the last ${adminPresence.window_minutes ?? 60} minutes`,
    },
    {
      label: "Permits Issued",
      value: overview.tickets_issued ?? 0,
      hint: `${overview.approved_applications ?? 0} approved applications issued`,
    },
  ];

  const userMix = [
    { label: "Students", value: overview.student_users ?? 0 },
    { label: "Teachers", value: overview.teacher_users ?? 0 },
    { label: "Admins", value: overview.admin_users ?? 0 },
    { label: "Active Accounts", value: overview.active_users ?? 0 },
  ];

  return (
    <div className="pk-admin-dashboard min-h-screen text-slate-100">
      <div className="pk-admin-noise" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="pk-admin-hero pk-admin-rise-1 overflow-hidden rounded-[30px] border border-white/10 px-6 py-7 shadow-[0_35px_120px_-65px_rgba(45,212,191,0.45)] sm:px-8 lg:px-10 lg:py-9">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-teal-300">
                Control Center
              </span>

              <div className="space-y-3">
                <h1 className="pk-admin-title max-w-4xl text-4xl leading-tight sm:text-5xl">
                  Orchestrate permits, reviews, and campus parking flow from one calm command deck.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Welcome back, {admin?.name || "Admin"}. This dashboard surfaces the live approval
                  queue, logged-in admin activity, and operational health in the same visual
                  language as the ParKar homepage.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadDashboard(true)}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
                >
                  {refreshing ? "Refreshing..." : "Refresh Dashboard"}
                </button>
                <Link
                  to="/admin/review"
                  className="inline-flex items-center justify-center rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Open Review Queue
                </Link>
                <Link
                  to="/logout"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/30 hover:text-white"
                >
                  Logout
                </Link>
              </div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                Live updates every 10 seconds | Last updated {formatDateTime(lastUpdated)}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {statCards.map((item, index) => (
                <article
                  key={item.label}
                  className={`pk-admin-glass pk-admin-rise-${index + 2} rounded-3xl border border-white/10 p-5 backdrop-blur`}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{item.hint}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
              <div className="h-8 w-52 animate-pulse rounded-full bg-white/10" />
              <div className="mt-6 h-52 animate-pulse rounded-[20px] bg-white/5" />
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
              <div className="h-8 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="mt-6 space-y-3">
                <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="pk-admin-panel pk-admin-rise-3 rounded-[24px] border border-white/10 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Semester spotlight
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {activeSemester?.name || "No active semester"}
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {formatRole(admin?.role)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Schedule
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {activeSemester
                        ? `${formatDate(activeSemester.start_date)} - ${formatDate(activeSemester.end_date)}`
                        : "Awaiting semester setup"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Keep approvals aligned with the current permit window.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Capacity and fee
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {activeSemester?.vehicle_quota ?? 0} spaces
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Fee: {activeSemester?.semester_fee ? `BDT ${activeSemester.semester_fee}` : "Unavailable"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  {userMix.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/8 bg-[#0b0d10] px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="pk-admin-panel pk-admin-rise-4 rounded-[24px] border border-white/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Admin presence
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Logged-in admins
                    </h2>
                  </div>
                  <span className="pk-admin-orb inline-flex h-12 w-12 items-center justify-center rounded-full border border-teal-400/20 text-xs font-semibold text-teal-200">
                    ON
                  </span>
                </div>

                <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Currently online
                  </p>
                  <p className="mt-2 text-4xl font-semibold text-white">
                    {adminPresence.logged_in_count ?? 0}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400"
                      style={{
                        width: `${Math.min(
                          ((Number(adminPresence.logged_in_count || 0) || 0) / Math.max(Number(overview.admin_users || 0) || 1, 1)) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-6 space-y-3">
                    {onlineAdmins.length ? (
                      paginatedOnlineAdmins.map((presenceAdmin) => (
                        <div
                          key={presenceAdmin.id}
                          className="rounded-2xl border border-white/8 bg-[#0b0d10] px-4 py-3"
                        >
                          <p className="font-semibold text-white">{presenceAdmin.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{presenceAdmin.email}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Last seen {formatDateTime(presenceAdmin.last_seen_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">
                        No admin activity detected in the current session window.
                      </p>
                    )}
                    <PaginationControls
                      currentPage={onlineAdminsPage}
                      itemLabel="admins"
                      onPageChange={setOnlineAdminsPage}
                      pageSize={onlineAdminsPageSize}
                      totalItems={totalOnlineAdmins}
                      totalPages={totalOnlineAdminsPages}
                    />
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-5">
              <article className="pk-admin-panel pk-admin-rise-5 rounded-[24px] border border-white/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Priority queue
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Pending applications to triage
                    </h2>
                  </div>
                  <Link
                    to="/admin/review"
                    className="text-sm font-semibold text-teal-300 transition hover:text-white"
                  >
                    Open full queue
                  </Link>
                </div>

                <div className="mt-6 space-y-3">
                  {priorityQueue.length ? (
                    paginatedPriorityQueue.map((application) => (
                      <div
                        key={application.id}
                        className="rounded-[22px] border border-white/8 bg-[#0b0d10] p-4 transition hover:border-teal-400/25 hover:bg-[#0f1317]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-white">
                              #{application.id} {application.applicant_name}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {application.semester?.name || "Semester unavailable"} - {application.vehicle?.plate_number || "No plate"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(application.status)}`}>
                              {application.status}
                            </span>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                              Submitted {formatDate(application.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
                      No pending applications need triage right now.
                    </div>
                  )}
                  <PaginationControls
                    currentPage={queuePage}
                    itemLabel="priority applications"
                    onPageChange={setQueuePage}
                    pageSize={queuePageSize}
                    totalItems={totalPriorityQueueItems}
                    totalPages={totalPriorityQueuePages}
                  />
                </div>
              </article>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="pk-admin-panel pk-admin-rise-3 rounded-[24px] border border-white/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Live submissions
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Recent applications
                    </h2>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-[22px] border border-white/8">
                  <div className="grid grid-cols-[1.15fr_0.7fr_0.55fr_0.6fr] gap-4 bg-white/5 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <span>Applicant</span>
                    <span>Vehicle</span>
                    <span>Status</span>
                    <span>Submitted</span>
                  </div>

                  <div className="divide-y divide-white/6">
                    {recentApplications.length ? (
                      paginatedRecentApplications.map((application) => (
                        <div
                          key={application.id}
                          className="grid grid-cols-1 gap-3 bg-[#0b0d10] px-4 py-4 md:grid-cols-[1.15fr_0.7fr_0.55fr_0.6fr] md:items-center md:gap-4"
                        >
                          <div>
                            <p className="font-semibold text-white">{application.applicant_name}</p>
                            <p className="mt-1 text-sm text-slate-400">
                              {application.applicant_email}
                            </p>
                          </div>
                          <div className="text-sm text-slate-300">
                            {application.vehicle
                              ? `${application.vehicle.brand} ${application.vehicle.model}`
                              : "Vehicle unavailable"}
                          </div>
                          <div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(application.status)}`}>
                              {application.status}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400">
                            {formatDateTime(application.created_at)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-[#0b0d10] px-4 py-5 text-sm text-slate-400">
                        No application activity yet.
                      </div>
                    )}
                  </div>
                </div>
                <PaginationControls
                  currentPage={applicationsPage}
                  itemLabel="recent applications"
                  onPageChange={setApplicationsPage}
                  pageSize={applicationsPageSize}
                  totalItems={totalRecentApplicationItems}
                  totalPages={totalRecentApplicationPages}
                />
              </article>

              <article className="pk-admin-panel pk-admin-rise-4 rounded-[24px] border border-white/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Audit trail
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Recent review actions
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {recentAuditLogs.length ? (
                    paginatedAuditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[22px] border border-white/8 bg-[#0b0d10] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-semibold text-white">
                            {log.application?.applicant_name || "Application"} #{log.application?.id || "N/A"}
                          </p>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${actionTone(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-400">
                          {log.reason || "No comment provided for this action."}
                        </p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
                      Review activity will appear here after approvals or rejections.
                    </div>
                  )}
                  <PaginationControls
                    currentPage={auditPage}
                    itemLabel="audit entries"
                    onPageChange={setAuditPage}
                    pageSize={auditPageSize}
                    totalItems={totalAuditItems}
                    totalPages={totalAuditPages}
                  />
                </div>
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
