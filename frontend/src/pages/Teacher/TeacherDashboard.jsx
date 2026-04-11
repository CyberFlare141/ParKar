import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { getAuthUser } from "../../auth/session";
import PaginationControls from "../../components/PaginationControls";
import useClientPagination from "../../components/useClientPagination";
import "./TeacherPortal.css";

const AUTO_REFRESH_INTERVAL_MS = 10000;

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved" || normalized === "active") return "pk-teacher-badge-success";
  if (normalized === "rejected") return "pk-teacher-badge-danger";
  return "pk-teacher-badge-warning";
}

function formatDocumentLabel(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function canRenewApplication(application) {
  const status = String(application?.status || "").toLowerCase();
  return status === "approved" || status === "active";
}

export default function TeacherDashboard() {
  const authUser = getAuthUser();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await client.get(ENDPOINTS.TEACHER_DASHBOARD, {
        skipAuthRedirect: true,
      });

      setDashboard(response?.data?.data || null);
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "Failed to load your dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);

    const intervalId = window.setInterval(() => {
      loadDashboard(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleFocus = () => loadDashboard(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadDashboard]);

  const teacher = dashboard?.student || authUser || {};
  const overview = dashboard?.overview || {};
  const applications = dashboard?.application_history || [];
  const documents = dashboard?.documents || [];
  const latestApplication = applications[0] || null;
  const renewableApplication = applications.find((application) => canRenewApplication(application)) || null;
  const quickStats = [
    {
      label: "Applications",
      value: overview.total_applications ?? 0,
      hint: `${overview.pending_applications ?? 0} pending`,
    },
    {
      label: "Approved",
      value: overview.approved_applications ?? 0,
      hint: `${overview.rejected_applications ?? 0} rejected`,
    },
    {
      label: "Vehicles",
      value: overview.total_vehicles ?? 0,
      hint: "Saved for faculty access",
    },
    {
      label: "Documents",
      value: overview.total_documents ?? 0,
      hint: `${overview.verified_documents ?? 0} verified`,
    },
  ];

  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(applications, {
    pageSize: 4,
  });

  const latestDocuments = useMemo(() => documents.slice(0, 4), [documents]);

  return (
    <div className="pk-teacher-shell text-slate-100">
      <div className="pk-teacher-backdrop" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="pk-teacher-hero overflow-hidden rounded-[28px] border border-white/10 px-6 py-7 shadow-[0_30px_120px_-60px_rgba(56,189,248,0.45)] sm:px-8 lg:px-10 lg:py-9">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
            <div className="space-y-5">
              <span className="pk-teacher-kicker inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sky-300">
                Faculty Portal
              </span>

              <div className="space-y-3">
                <h1 className="pk-teacher-title max-w-3xl text-4xl leading-tight sm:text-5xl">
                  Welcome back, <span>{teacher?.name || "Faculty Member"}</span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Manage your faculty parking access, track application reviews, and keep
                  vehicle records ready from a dashboard that matches the rest of ParKar.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/teacher/apply"
                  className="inline-flex items-center justify-center rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  New Application
                </Link>
                <Link
                  to="/teacher/vehicles"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-300/40 hover:text-sky-200"
                >
                  Manage Vehicles
                </Link>
                {renewableApplication ? (
                  <Link
                    to="/teacher/renew"
                    className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/15"
                  >
                    Renew Application
                  </Link>
                ) : null}
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/30 hover:text-white"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => loadDashboard(true)}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-300/40 hover:text-sky-200"
                >
                  {refreshing ? "Refreshing..." : "Refresh Status"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {quickStats.map((item) => (
                <article
                  key={item.label}
                  className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur"
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
          <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
            Live updates every 10 seconds | Last updated {formatDateTime(lastUpdated)}
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
              <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
              <div className="mt-6 h-48 animate-pulse rounded-[20px] bg-white/5" />
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
              <div className="h-8 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="mt-6 space-y-3">
                <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6 shadow-[0_20px_80px_-48px_rgba(0,0,0,0.8)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                      Current Faculty Application
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {latestApplication ? `Application #${latestApplication.id}` : "No application yet"}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(
                      latestApplication?.status,
                    )}`}
                  >
                    {latestApplication?.status || "Not Started"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Submission Time
                    </p>
                    <p className="mt-2 text-base font-medium text-slate-100">
                      {latestApplication ? formatDateTime(latestApplication.created_at) : "No submission yet"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Latest Ticket
                    </p>
                    <p className="mt-2 text-base font-medium text-slate-100">
                      {latestApplication?.ticket?.ticket_id || "Not issued"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-[#0b0d10] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Vehicle
                    </p>
                    <p className="mt-2 text-base font-medium text-slate-100">
                      {latestApplication?.vehicle
                        ? `${latestApplication.vehicle.brand} ${latestApplication.vehicle.model}`
                        : "No vehicle linked yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Plate: {latestApplication?.vehicle?.plate_number || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-[#0b0d10] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Admin Note
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      {latestApplication?.admin_comment ||
                        "No admin comment yet. Review feedback will appear here."}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6 shadow-[0_20px_80px_-48px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                      Faculty Snapshot
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Account Details
                    </h2>
                  </div>
                  <Link
                    to="/logout"
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:text-sky-200"
                  >
                    Logout
                  </Link>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["University ID", teacher?.university_id || "N/A"],
                    ["Email", teacher?.email || "N/A"],
                    ["Phone", teacher?.phone || "N/A"],
                    ["Department", teacher?.department || "Not set"],
                    ["Role", "Teacher"],
                    ["Documents Verified", `${overview.verified_documents ?? 0} verified`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                    >
                      <span className="text-sm text-slate-400">{label}</span>
                      <span className="text-sm font-medium text-slate-100">{value}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                      Recent Activity
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Application Timeline
                    </h2>
                  </div>
                  <Link
                    to="/teacher/apply"
                    className="text-sm font-semibold text-sky-300 transition hover:text-white"
                  >
                    Submit another
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  {applications.length ? (
                    paginatedItems.map((application) => (
                      <div
                        key={application.id}
                        className="rounded-[22px] border border-white/8 bg-[#0b0d10] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-white">
                              Application #{application.id}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {application?.semester?.name || "Semester unavailable"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(
                              application.status,
                            )}`}
                          >
                            {application.status}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Submitted
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {formatDateTime(application.created_at)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Vehicle
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {application?.vehicle
                                ? `${application.vehicle.brand} ${application.vehicle.model}`
                                : "Vehicle not found"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Slot
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {application?.ticket?.parking_slot || "Not assigned"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
                      You have not submitted any faculty parking application yet.
                    </div>
                  )}
                  <PaginationControls
                    currentPage={currentPage}
                    itemLabel="applications"
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    totalPages={totalPages}
                  />
                </div>
              </article>

              <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                    Documents
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Latest Uploads
                  </h2>
                </div>

                <div className="pk-teacher-scroll mt-6 space-y-3">
                  {latestDocuments.length ? (
                    latestDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {formatDocumentLabel(document.document_type)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Uploaded {formatDateTime(document.created_at)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${
                            document.is_verified
                              ? "pk-teacher-badge-success"
                              : "pk-teacher-badge-warning"
                          }`}
                        >
                          {document.is_verified ? "Verified" : "Pending"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                      No uploaded documents yet.
                    </p>
                  )}
                </div>
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
