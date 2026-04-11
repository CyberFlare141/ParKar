import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { clearAuthSession, getAuthUser } from "../../auth/session";
import PaginationControls from "../../components/PaginationControls";
import useClientPagination from "../../components/useClientPagination";
import {
  getCombinedStudentApplications,
  getRenewalAlertClass,
  getRenewalBadgeClass,
  getRenewalMeta,
} from "./renewalUtils";
import "./RenewalOverview.css";

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

export default function RenewalOverview() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
              "Failed to load renewal-ready applications.",
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

  const baseApplications = useMemo(
    () => dashboard?.application_history || dashboard?.recent_applications || [],
    [dashboard],
  );
  const applications = useMemo(
    () => getCombinedStudentApplications(authUser?.id, baseApplications),
    [authUser?.id, baseApplications],
  );
  const renewableApplications = useMemo(
    () =>
      applications.filter((application) => getRenewalMeta(application, authUser?.id).canRenew),
    [applications, authUser?.id],
  );
  const pendingApplications = useMemo(
    () =>
      applications.filter(
        (application) => String(application?.status || "").toLowerCase() === "pending",
      ),
    [applications],
  );
  const {
    currentPage: renewablePage,
    pageSize: renewablePageSize,
    paginatedItems: paginatedRenewableApplications,
    setCurrentPage: setRenewablePage,
    totalItems: totalRenewableApplications,
    totalPages: totalRenewablePages,
  } = useClientPagination(renewableApplications, {
    pageSize: 3,
  });
  const {
    currentPage: pendingPage,
    pageSize: pendingPageSize,
    paginatedItems: paginatedPendingApplications,
    setCurrentPage: setPendingPage,
    totalItems: totalPendingApplications,
    totalPages: totalPendingPages,
  } = useClientPagination(pendingApplications, {
    pageSize: 4,
  });

  return (
    <div className="student-renew-overview-page">
      <div className="student-renew-overview-shell">
        <section className="student-renew-overview-hero">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-teal-300">
                Student Renewal
              </span>
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  Renew Application
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Choose an approved application to renew. Pending applications cannot be
                  renewed yet because renewal starts only after approval and the 6-month
                  validity window begins from the approved record.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <NavigationPill to="/student/dashboard" label="Dashboard" />
              <NavigationPill to="/profile" label="Profile" />
              <NavigationPill to="/student/history" label="Applications" />
              <NavigationPill
                label="Logout"
                onClick={() => {
                  clearAuthSession();
                  navigate("/logout");
                }}
              />
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6">
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            </div>
          </section>
        ) : renewableApplications.length ? (
          <section className="space-y-4">
            {paginatedRenewableApplications.map((application) => {
              const renewalMeta = getRenewalMeta(application, authUser?.id);

              return (
                <article key={application.id} className="student-renew-overview-panel">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                        Renewable Application
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Application #{application.id}
                      </h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {application?.vehicle
                          ? `${application.vehicle.brand} ${application.vehicle.model} (${application.vehicle.plate_number})`
                          : "Vehicle details unavailable"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getRenewalBadgeClass(
                        renewalMeta.renewalStatus,
                      )}`}
                    >
                      {renewalMeta.renewalStatus}
                    </span>
                  </div>

                  <div
                    className={`mt-5 rounded-2xl border px-4 py-4 text-sm ${getRenewalAlertClass(
                      renewalMeta.alertTone,
                    )}`}
                  >
                    <p className="font-semibold uppercase tracking-[0.16em]">
                      Renewal Status
                    </p>
                    <p className="mt-2 leading-6">{renewalMeta.alertMessage}</p>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
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
                  </div>

                  <div className="mt-5">
                    <Link
                      to={`/student/renew/${application.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
                    >
                      Open Renewal Flow
                    </Link>
                  </div>
                </article>
              );
            })}
            <PaginationControls
              currentPage={renewablePage}
              itemLabel="renewable applications"
              onPageChange={setRenewablePage}
              pageSize={renewablePageSize}
              totalItems={totalRenewableApplications}
              totalPages={totalRenewablePages}
            />
          </section>
        ) : (
          <section className="student-renew-overview-panel">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                No Renewable Application Yet
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Nothing is ready for renewal right now
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                If you only see a pending application, that is expected. Renewal becomes
                available only after an application is approved. Once approved, this page
                will show the expiry date and give you a direct renewal button.
              </p>

              {pendingApplications.length ? (
                <div className="mt-5 space-y-3">
                  {paginatedPendingApplications.map((application) => (
                    <div
                      key={application.id}
                      className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            Application #{application.id}
                          </p>
                          <p className="mt-1 text-sm text-amber-100">
                            Status: Pending approval
                          </p>
                        </div>
                        <Link
                          to="/student/history"
                          className="rounded-full border border-amber-200/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100 transition hover:bg-white/10"
                        >
                          View Application
                        </Link>
                      </div>
                    </div>
                  ))}
                  <PaginationControls
                    currentPage={pendingPage}
                    itemLabel="pending applications"
                    onPageChange={setPendingPage}
                    pageSize={pendingPageSize}
                    totalItems={totalPendingApplications}
                    totalPages={totalPendingPages}
                  />
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
