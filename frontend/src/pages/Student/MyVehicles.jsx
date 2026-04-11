import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { getAuthUser } from "../../auth/session";
import PaginationControls from "../../components/PaginationControls";
import useClientPagination from "../../components/useClientPagination";
import { getCombinedStudentApplications } from "./renewalUtils";
import "./MyVehicles.css";

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

function statusClassName(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "approved" || normalized === "active") {
    return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
  }

  return "border-amber-300/20 bg-amber-400/10 text-amber-100";
}

export default function MyVehicles() {
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
              "Failed to load approved vehicle details.",
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
  const approvedVehicleEntries = useMemo(() => {
    const entries = applications.filter((application) => {
      const status = String(application?.status || "").toLowerCase();
      return (status === "approved" || status === "active") && application?.vehicle;
    });

    const seenVehicleIds = new Set();

    return entries.filter((application) => {
      const vehicleId = application?.vehicle?.id ?? application?.vehicle?.plate_number;
      if (!vehicleId || seenVehicleIds.has(vehicleId)) {
        return false;
      }

      seenVehicleIds.add(vehicleId);
      return true;
    });
  }, [applications]);
  const {
    currentPage,
    pageSize,
    paginatedItems: paginatedVehicles,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(approvedVehicleEntries, {
    pageSize: 4,
  });

  return (
    <div className="student-vehicles-page">
      <div className="student-vehicles-shell">
        <section className="student-vehicles-hero">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-teal-300">
                Approved Vehicles
              </span>
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  My Vehicles
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  View vehicle details that are currently attached to approved or active
                  parking applications.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/student/history"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
              >
                Applications
              </Link>
              <Link
                to="/student/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="h-52 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />
            <div className="h-52 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />
          </section>
        ) : approvedVehicleEntries.length ? (
          <section className="grid gap-5 md:grid-cols-2">
            {paginatedVehicles.map((application) => (
                <article key={application.id} className="student-vehicles-panel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                      Approved Vehicle
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {application?.vehicle?.brand} {application?.vehicle?.model}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName(
                      application.status,
                    )}`}
                  >
                    {application.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Plate Number
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {application?.vehicle?.plate_number || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Vehicle Type
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {application?.vehicle?.vehicle_type || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Color
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {application?.vehicle?.color || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Registration Number
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {application?.vehicle?.registration_number || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-[#0b0d10] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Application
                    </p>
                    <p className="mt-2 text-sm text-slate-200">#{application.id}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Submitted {formatDateTime(application.created_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-[#0b0d10] p-4">
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

                <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Approval Snapshot
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Approved vehicle details are shown from the latest approved application
                    linked to this vehicle.
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Valid from {formatDate(application.reviewed_at || application.created_at)}
                  </p>
                </div>
              </article>
            ))}
            <div className="md:col-span-2">
              <PaginationControls
                currentPage={currentPage}
                itemLabel="vehicles"
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
              />
            </div>
          </section>
        ) : (
          <section className="student-vehicles-panel">
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
              No approved vehicles are available yet. Once an application is approved, its
              vehicle details will appear here.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
