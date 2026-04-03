import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { getAuthUser } from "../../auth/session";
import {
  getCombinedStudentApplications,
  getRenewalAlertClass,
  getRenewalBadgeClass,
  getRenewalMeta,
  getUserRenewalHistoryEntries,
} from "./renewalUtils";
import "./StudentDashboard.css";

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

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "pk-student-badge-success";
  if (normalized === "rejected") return "pk-student-badge-danger";
  if (normalized === "pending") return "pk-student-badge-warning";
  return "pk-student-badge-warning";
}

const AUTO_REFRESH_INTERVAL_MS = 10000;

export default function StudentDashboard() {
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

      const response = await client.get(ENDPOINTS.STUDENT_DASHBOARD, {
        skipAuthRedirect: true,
      });

      setDashboard(response?.data?.data || null);
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message || "Failed to load your dashboard.",
      );
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

    const handleFocus = () => {
      loadDashboard(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadDashboard]);

  const student = dashboard?.student || authUser || {};
  const overview = dashboard?.overview || {};
  const baseApplications = dashboard?.application_history || [];
  const recentApplications = dashboard?.recent_applications || [];
  const documents = dashboard?.documents || [];
  const activeSemester = dashboard?.active_semester;
  const combinedApplications = getCombinedStudentApplications(student?.id, baseApplications);
  const latestApplication = combinedApplications[0] || dashboard?.latest_application;
  const renewalHistoryEntries = getUserRenewalHistoryEntries(student?.id, baseApplications);
  const combinedRecentApplications = combinedApplications.slice(0, 5);
  const latestRenewalMeta = getRenewalMeta(latestApplication, authUser?.id);
  const renewalApplications = recentApplications.filter((application) =>
    getRenewalMeta(application, authUser?.id).canRenew,
  );

  const quickStats = [
    {
      label: "Applications",
      value: (overview.total_applications ?? 0) + renewalHistoryEntries.length,
      hint: `${
        (overview.pending_applications ?? 0) +
        renewalHistoryEntries.filter(
          (application) => String(application?.status || "").toLowerCase() === "pending",
        ).length
      } pending`,
    },
    {
      label: "Approved",
      value: overview.approved_applications ?? 0,
      hint: `${overview.rejected_applications ?? 0} rejected`,
    },
    {
      label: "Vehicles",
      value: overview.total_vehicles ?? 0,
      hint: "Saved for permits",
    },
    {
      label: "Documents",
      value: overview.total_documents ?? 0,
      hint: `${overview.verified_documents ?? 0} verified`,
    },
  ];

  return (
    <div className="pk-student-shell min-h-screen text-slate-100">
      <div className="pk-student-backdrop" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="pk-student-hero overflow-hidden rounded-[28px] border border-white/10 px-6 py-7 shadow-[0_30px_120px_-60px_rgba(45,212,191,0.45)] sm:px-8 lg:px-10 lg:py-9">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
            <div className="space-y-5">
              <span className="pk-student-kicker inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-teal-300">
                Student Portal
              </span>

              <div className="space-y-3">
                <h1 className="pk-student-title max-w-3xl text-4xl leading-tight sm:text-5xl">
                  Welcome back, <span>{student?.name || "Student"}</span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Track your parking permit progress, review recent submissions, and
                  manage vehicles and documents from one dashboard built to match the
                  ParKar home experience.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/student/apply"
                  className="inline-flex items-center justify-center rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Apply for Parking
                </Link>
                <Link
                  to="/student/history"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
                >
                  View History
                </Link>
                {latestRenewalMeta.canRenew ? (
                  <Link
                    to={`/student/renew/${latestApplication?.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/15"
                  >
                    Renew Application
                  </Link>
                ) : null}
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/30 hover:text-white"
                >
                  Edit Profile
                </Link>
                <button
                  type="button"
                  onClick={() => loadDashboard(true)}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
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

        {!loading && latestApplication && latestRenewalMeta.canRenew ? (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm ${getRenewalAlertClass(
              latestRenewalMeta.alertTone,
            )}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold uppercase tracking-[0.16em]">
                  Renewal Alert
                </p>
                <p className="mt-2 leading-6">{latestRenewalMeta.alertMessage}</p>
              </div>
              <Link
                to={`/student/renew/${latestApplication.id}`}
                className="rounded-full border border-current/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10"
              >
                Open Renewal
              </Link>
            </div>
          </div>
        ) : null}

        {loading ? (
          <section className="grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
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
            <section className="grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
              <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6 shadow-[0_20px_80px_-48px_rgba(0,0,0,0.8)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Current Permit Status
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {latestApplication ? `Application #${latestApplication.id}` : "No application yet"}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      latestRenewalMeta.canRenew
                        ? getRenewalBadgeClass(latestRenewalMeta.lifecycleStatus)
                        : statusTone(latestApplication?.status)
                    }`}
                  >
                    {latestRenewalMeta.canRenew
                      ? latestRenewalMeta.lifecycleStatus
                      : latestApplication?.status || "Not Started"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Active Semester
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {activeSemester?.name || "No active semester"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {activeSemester
                        ? `${formatDate(activeSemester.start_date)} - ${formatDate(activeSemester.end_date)}`
                        : "Semester schedule is not available yet."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Expiry Date
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {latestRenewalMeta.canRenew
                        ? formatDate(latestRenewalMeta.expiresAt)
                        : "Unavailable"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Renewal status: {latestRenewalMeta.renewalStatus}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Latest Ticket
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {latestApplication?.ticket?.ticket_id || "Not issued"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Slot: {latestApplication?.ticket?.parking_slot || "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-[#0b0d10] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Submission Time
                    </p>
                    <p className="mt-2 text-base font-medium text-slate-100">
                      {latestApplication ? formatDateTime(latestApplication.created_at) : "No submission yet"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-[#0b0d10] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Renewal Count
                    </p>
                    <p className="mt-2 text-base font-medium text-slate-100">
                      {latestRenewalMeta.renewalCount}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Last renewed: {formatDateTime(latestRenewalMeta.lastRenewedAt)}
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
                </div>

                <div className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Admin Note
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {latestApplication?.admin_comment ||
                      "No admin comment yet. Your latest application will show review feedback here."}
                  </p>
                </div>
              </article>

              <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6 shadow-[0_20px_80px_-48px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Profile Snapshot
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Account Details
                    </h2>
                  </div>
                  <Link
                    to="/logout"
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200"
                  >
                    Logout
                  </Link>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["University ID", student?.university_id || "N/A"],
                    ["Email", student?.email || "N/A"],
                    ["Phone", student?.phone || "N/A"],
                    ["Department", student?.department || "Not set"],
                    ["Verified", student?.email_verified_at ? "Email verified" : "Pending verification"],
                    [
                      "Semester Fee",
                      activeSemester?.semester_fee ? `BDT ${activeSemester.semester_fee}` : "Unavailable",
                    ],
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
                    <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                      Recent Activity
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Recent Applications
                    </h2>
                  </div>
                  <Link
                    to="/student/history"
                    className="text-sm font-semibold text-teal-300 transition hover:text-white"
                  >
                    Full history
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  {combinedRecentApplications.length ? (
                    combinedRecentApplications.map((application) => {
                      const renewalMeta = getRenewalMeta(application, authUser?.id);

                      return (
                        <div
                          key={application.id}
                          className="rounded-[22px] border border-white/8 bg-[#0b0d10] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
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
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(application.status)}`}
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
                                  ? `${application.vehicle.brand} ${application.vehicle.model} (${application.vehicle.plate_number})`
                                  : "Vehicle not found"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Expiry
                              </p>
                              <p className="mt-1 text-sm text-slate-300">
                                {formatDate(renewalMeta.expiresAt)}
                              </p>
                            </div>
                          </div>

                          {renewalMeta.canRenew ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getRenewalBadgeClass(
                                  renewalMeta.renewalStatus,
                                )}`}
                              >
                                {renewalMeta.renewalStatus}
                              </span>
                              <Link
                                to={`/student/renew/${application.id}`}
                                className="text-sm font-semibold text-amber-200 transition hover:text-white"
                              >
                                Renew application
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
                      You have not submitted any parking application yet.
                    </div>
                  )}
                </div>
              </article>

              <div className="grid gap-5">
                <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6">
                  <div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                        Renewal Queue
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Eligible Applications
                      </h2>
                    </div>
                  </div>

                  <div className="pk-student-vehicle-list mt-6 space-y-3">
                    {renewalApplications.length ? (
                      renewalApplications.map((application) => {
                        const renewalMeta = getRenewalMeta(application, authUser?.id);

                        return (
                        <div
                          key={application.id}
                          className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">
                                  Application #{application.id}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                  Expires {formatDate(renewalMeta.expiresAt)}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${getRenewalBadgeClass(
                                  renewalMeta.renewalStatus,
                                )}`}
                              >
                                {renewalMeta.renewalStatus}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-slate-400">
                              {application?.vehicle
                                ? `${application.vehicle.brand} ${application.vehicle.model} (${application.vehicle.plate_number})`
                                : "Vehicle details unavailable"}
                            </p>
                            <Link
                              to={`/student/renew/${application.id}`}
                              className="mt-3 inline-flex text-sm font-semibold text-teal-200 transition hover:text-white"
                            >
                              Start renewal
                            </Link>
                        </div>
                        );
                      })
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                        No approved applications are ready for renewal right now.
                      </p>
                    )}
                  </div>
                </article>

                <article className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6">
                  <div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                        Documents
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Latest Uploads
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {documents.length ? (
                      documents.slice(0, 4).map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {formatLabel(document.document_type)}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                              Uploaded {formatDate(document.created_at)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${
                              document.is_verified
                                ? "pk-student-badge-success"
                                : "pk-student-badge-warning"
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
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
