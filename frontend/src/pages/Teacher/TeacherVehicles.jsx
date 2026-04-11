import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls from "../../components/PaginationControls";
import useClientPagination from "../../components/useClientPagination";
import "./TeacherPortal.css";

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

export default function TeacherVehicles() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await client.get(ENDPOINTS.TEACHER_DASHBOARD, {
        skipAuthRedirect: true,
      });

      setDashboard(response?.data?.data || null);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "Failed to load teacher vehicles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const vehicles = dashboard?.vehicles || [];
  const applicationHistory = dashboard?.application_history || [];
  const vehicleStatusMap = useMemo(
    () =>
      new Map(
        applicationHistory
          .filter((application) => application?.vehicle?.id)
          .map((application) => [application.vehicle.id, application.status]),
      ),
    [applicationHistory],
  );

  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(vehicles, {
    pageSize: 6,
  });

  return (
    <div className="pk-teacher-shell text-slate-100">
      <div className="pk-teacher-backdrop" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="pk-teacher-hero overflow-hidden rounded-[28px] border border-white/10 px-6 py-7 shadow-[0_30px_120px_-60px_rgba(56,189,248,0.45)] sm:px-8 lg:px-10 lg:py-9">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-4">
              <span className="pk-teacher-kicker inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sky-300">
                Faculty Fleet
              </span>
              <div className="space-y-3">
                <h1 className="pk-teacher-title text-4xl leading-tight sm:text-5xl">
                  Vehicle records for <span>teacher access</span>
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Review the vehicles currently attached to your faculty parking requests
                  and keep the details aligned with the rest of your account.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/teacher/apply"
                className="inline-flex items-center justify-center rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-white"
              >
                New Application
              </Link>
              <Link
                to="/teacher/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-300/40 hover:text-sky-200"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="rounded-[24px] border border-white/10 bg-[#111418]/90 p-6 shadow-[0_20px_80px_-48px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                Registered Vehicles
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Current teacher vehicle list
              </h2>
            </div>
            <button
              type="button"
              onClick={loadVehicles}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:text-sky-200"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-48 animate-pulse rounded-3xl bg-white/5" />
              ))}
            </div>
          ) : paginatedItems.length ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {paginatedItems.map((vehicle) => (
                  <article
                    key={vehicle.id}
                    className="rounded-3xl border border-white/10 bg-[#0b0d10] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Plate Number
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          {vehicle.plate_number || "N/A"}
                        </h3>
                      </div>
                      <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-sky-200">
                        {vehicle.vehicle_type || "vehicle"}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Vehicle</span>
                        <strong className="text-slate-100">
                          {vehicle.brand || "N/A"} {vehicle.model || ""}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Color</span>
                        <strong className="text-slate-100">{vehicle.color || "N/A"}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Registration</span>
                        <strong className="text-slate-100">
                          {vehicle.registration_number || "N/A"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Latest Status</span>
                        <strong className="text-slate-100">
                          {vehicleStatusMap.get(vehicle.id) || "No application"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Added</span>
                        <strong className="text-slate-100">{formatDateTime(vehicle.created_at)}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <PaginationControls
                currentPage={currentPage}
                itemLabel="vehicles"
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
              />
            </>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm text-slate-400">
              No vehicles are linked to this teacher account yet. Submit a parking application to
              start building your vehicle list.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
