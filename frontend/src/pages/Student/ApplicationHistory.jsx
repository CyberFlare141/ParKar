import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

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
  return "bg-amber-400/15 text-amber-100 border-amber-300/20";
}

export default function ApplicationHistory() {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

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
  const overview = history?.overview || {};

  return (
    <div className="min-h-screen bg-[#071118] px-4 py-6 text-slate-100 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_42%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.95))] px-6 py-7 shadow-[0_30px_120px_-60px_rgba(45,212,191,0.45)] sm:px-8 lg:px-10">
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
                to="/student/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Total {overview.total_applications ?? 0}
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-amber-100">
              Pending {overview.pending_applications ?? 0}
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-emerald-200">
              Approved {overview.approved_applications ?? 0}
            </span>
            <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1.5 text-rose-200">
              Rejected {overview.rejected_applications ?? 0}
            </span>
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

        <section className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6 shadow-[0_20px_80px_-48px_rgba(0,0,0,0.8)]">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            </div>
          ) : applications.length ? (
            <div className="space-y-4">
              {applications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-[22px] border border-white/8 bg-[#0b0d10] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        Application #{application.id}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {application?.semester?.name || "Semester unavailable"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(application.status)}`}
                    >
                      {application.status || "unknown"}
                    </span>
                  </div>

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
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Ticket
                      </p>
                      <p className="mt-2 text-sm text-slate-200">
                        {application?.ticket?.ticket_id || "Not issued"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Slot: {application?.ticket?.parking_slot || "Not assigned"}
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
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
              You have not submitted any parking application yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
