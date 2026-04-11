import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { clearAuthSession, getAuthUser } from "../../auth/session";
import PaginationControls, { useClientPagination } from "../../components/PaginationControls";
import { getCombinedStudentApplications } from "./renewalUtils";
import "./MyDocuments.css";

const AUTO_REFRESH_INTERVAL_MS = 10000;

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

function statusTone(isVerified) {
  return isVerified
    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
    : "border-amber-300/20 bg-amber-400/10 text-amber-100";
}

function buildDocumentKey(document) {
  return String(
    document?.id ||
      `${document?.document_type || "document"}-${document?.created_at || ""}-${document?.file_path || ""}`,
  );
}

export default function MyDocuments() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDocuments = useCallback(async (isRefresh = false) => {
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
      setError(loadError?.response?.data?.message || "Failed to load your documents.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments(false);

    const intervalId = window.setInterval(() => {
      loadDocuments(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      loadDocuments(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadDocuments]);

  const student = dashboard?.student || authUser || {};
  const baseApplications = dashboard?.application_history || [];
  const combinedApplications = getCombinedStudentApplications(student?.id, baseApplications);
  const rootDocuments = dashboard?.documents || [];

  const applicationDocumentGroups = useMemo(
    () =>
      combinedApplications
        .filter((application) => !application?.is_renewal)
        .map((application) => {
          const documents = Array.isArray(application?.documents)
            ? application.documents
            : [];

          return {
            id: application.id,
            title: `Application #${application.id}`,
            status: application.status || "unknown",
            submittedAt: application.created_at,
            semester: application?.semester?.name || "Semester unavailable",
            vehicle: application?.vehicle
              ? `${application.vehicle.brand} ${application.vehicle.model}`
              : "Vehicle unavailable",
            plateNumber: application?.vehicle?.plate_number || "N/A",
            documents: documents.map((document) => ({
              ...document,
              _documentKey: buildDocumentKey(document),
            })),
          };
        })
        .filter((group) => group.documents.length > 0),
    [combinedApplications],
  );

  const groupedDocumentKeys = useMemo(
    () =>
      new Set(
        applicationDocumentGroups.flatMap((group) =>
          group.documents.map((document) => document._documentKey),
        ),
      ),
    [applicationDocumentGroups],
  );

  const standaloneDocuments = useMemo(
    () =>
      rootDocuments
        .map((document) => ({
          ...document,
          _documentKey: buildDocumentKey(document),
        }))
        .filter((document) => !groupedDocumentKeys.has(document._documentKey)),
    [groupedDocumentKeys, rootDocuments],
  );

  const summary = useMemo(() => {
    const allDocuments = [
      ...applicationDocumentGroups.flatMap((group) => group.documents),
      ...standaloneDocuments,
    ];

    return {
      total: allDocuments.length,
      verified: allDocuments.filter((document) => Boolean(document?.is_verified)).length,
      pending: allDocuments.filter((document) => !document?.is_verified).length,
      applications: applicationDocumentGroups.length,
    };
  }, [applicationDocumentGroups, standaloneDocuments]);

  const latestDocuments = useMemo(
    () =>
      [...applicationDocumentGroups.flatMap((group) => group.documents), ...standaloneDocuments]
        .sort((left, right) => {
          const leftTime = new Date(left?.created_at || 0).getTime();
          const rightTime = new Date(right?.created_at || 0).getTime();
          return rightTime - leftTime;
        }),
    [applicationDocumentGroups, standaloneDocuments],
  );
  const {
    currentPage: applicationPage,
    pageSize: applicationPageSize,
    paginatedItems: paginatedApplicationGroups,
    setCurrentPage: setApplicationPage,
    totalItems: totalApplicationGroups,
    totalPages: totalApplicationPages,
  } = useClientPagination(applicationDocumentGroups, {
    pageSize: 3,
  });
  const {
    currentPage: latestPage,
    pageSize: latestPageSize,
    paginatedItems: paginatedLatestDocuments,
    setCurrentPage: setLatestPage,
    totalItems: totalLatestDocuments,
    totalPages: totalLatestPages,
  } = useClientPagination(latestDocuments, {
    pageSize: 4,
  });
  const {
    currentPage: standalonePage,
    pageSize: standalonePageSize,
    paginatedItems: paginatedStandaloneDocuments,
    setCurrentPage: setStandalonePage,
    totalItems: totalStandaloneDocuments,
    totalPages: totalStandalonePages,
  } = useClientPagination(standaloneDocuments, {
    pageSize: 4,
  });

  return (
    <div className="student-documents-page">
      <div className="student-documents-shell">
        <section className="student-documents-hero">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-teal-300">
                Student Documents
              </span>
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  Application documents
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300/80 sm:text-base">
                  Review the documents you uploaded during the application process, see
                  which application each file belongs to, and keep track of verification
                  progress without leaving the student area.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/student/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
              >
                Profile
              </Link>
              <Link
                to="/student/history"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
              >
                Applications
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAuthSession();
                  navigate("/logout");
                }}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:text-teal-200"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Documents",
                value: summary.total,
                hint: "Across all application records",
              },
              {
                label: "Verified",
                value: summary.verified,
                hint: "Marked as checked",
              },
              {
                label: "Pending Review",
                value: summary.pending,
                hint: "Still awaiting validation",
              },
              {
                label: "Applications",
                value: summary.applications,
                hint: "With uploaded files",
              },
            ].map((item) => (
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

          <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            <button
              type="button"
              onClick={() => loadDocuments(true)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-teal-300/30 hover:text-teal-200"
            >
              {refreshing ? "Refreshing..." : "Refresh Documents"}
            </button>
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

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <article className="student-documents-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                  Application Records
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Uploaded during application
                </h2>
              </div>
              <Link
                to="/student/apply"
                className="inline-flex items-center justify-center rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Apply for Permit
              </Link>
            </div>

            {loading ? (
              <div className="mt-6 space-y-4">
                <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              </div>
            ) : applicationDocumentGroups.length ? (
              <div className="mt-6 space-y-5">
                {paginatedApplicationGroups.map((group) => (
                  <article key={group.id} className="student-documents-application-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">{group.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{group.semester}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {group.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Submitted
                        </p>
                        <p className="mt-2 text-sm text-slate-200">
                          {formatDateTime(group.submittedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Vehicle
                        </p>
                        <p className="mt-2 text-sm text-slate-200">{group.vehicle}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Plate Number
                        </p>
                        <p className="mt-2 text-sm text-slate-200">{group.plateNumber}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {group.documents.map((document) => (
                        <div
                          key={document._documentKey}
                          className="rounded-2xl border border-white/8 bg-[#0b0d10] px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-white">
                                {formatLabel(document.document_type)}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                                Uploaded {formatDate(document.created_at)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${statusTone(
                                document.is_verified,
                              )}`}
                            >
                              {document.is_verified ? "Verified" : "Pending"}
                            </span>
                          </div>

                          <p className="mt-3 text-sm text-slate-400">
                            File record: {document.file_path || "Stored in application record"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
                <PaginationControls
                  currentPage={applicationPage}
                  itemLabel="application records"
                  onPageChange={setApplicationPage}
                  pageSize={applicationPageSize}
                  totalItems={totalApplicationGroups}
                  totalPages={totalApplicationPages}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">
                No application documents are available yet. Once you submit a permit
                application, the uploaded files will appear here.
              </div>
            )}
          </article>

          <div className="grid gap-6">
            <article className="student-documents-panel">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                  Latest Uploads
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Recent document activity
                </h2>
              </div>

              <div className="mt-6 space-y-3">
                {loading ? (
                  <>
                    <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                    <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                    <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                  </>
                ) : latestDocuments.length ? (
                  paginatedLatestDocuments.map((document) => (
                    <div
                      key={document._documentKey}
                      className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">
                            {formatLabel(document.document_type)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Uploaded {formatDateTime(document.created_at)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${statusTone(
                            document.is_verified,
                          )}`}
                        >
                          {document.is_verified ? "Verified" : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                    No recent document uploads found.
                  </p>
                )}
                <PaginationControls
                  currentPage={latestPage}
                  itemLabel="recent documents"
                  onPageChange={setLatestPage}
                  pageSize={latestPageSize}
                  totalItems={totalLatestDocuments}
                  totalPages={totalLatestPages}
                />
              </div>
            </article>

            <article className="student-documents-panel">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-teal-300">
                  Additional Records
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Standalone uploads
                </h2>
              </div>

              <div className="mt-6 space-y-3">
                {loading ? (
                  <>
                    <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                    <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                  </>
                ) : standaloneDocuments.length ? (
                  paginatedStandaloneDocuments.map((document) => (
                    <div
                      key={document._documentKey}
                      className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">
                            {formatLabel(document.document_type)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Uploaded {formatDate(document.created_at)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${statusTone(
                            document.is_verified,
                          )}`}
                        >
                          {document.is_verified ? "Verified" : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                    No extra standalone uploads outside your application records.
                  </p>
                )}
                <PaginationControls
                  currentPage={standalonePage}
                  itemLabel="standalone documents"
                  onPageChange={setStandalonePage}
                  pageSize={standalonePageSize}
                  totalItems={totalStandaloneDocuments}
                  totalPages={totalStandalonePages}
                />
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
