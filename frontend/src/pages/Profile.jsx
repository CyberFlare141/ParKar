import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { getAuthToken, getAuthUser, setAuthSession } from "../auth/session";
import PaginationControls from "../components/PaginationControls";
import useClientPagination from "../components/useClientPagination";
import { getCombinedStudentApplications, getRenewalMeta } from "./Student/renewalUtils";
import "./Profile.css";

function getStoredUser() {
  return getAuthUser();
}

function mapUserToProfile(user) {
  const role = (user?.role || "student").toLowerCase();
  const designation =
    role === "teacher" ? "Faculty" : role === "admin" ? "Staff" : "Student";
  const fullName = user?.name || "Unknown User";

  return {
    id: user?.id || null,
    fullName,
    studentId: user?.university_id || "Not provided",
    designation,
    department: user?.department || "Not provided",
    email: user?.email || "Not provided",
    phone: user?.phone || "Not provided",
    role,
    photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName,
    )}&background=0f4cbd&color=ffffff`,
  };
}

function getStatusClassName(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "active" || normalized === "approved") {
    return "status-tag status-active";
  }

  if (normalized.includes("pending")) {
    return "status-tag status-pending";
  }

  return "status-tag status-expired";
}

function formatVehicleType(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Vehicle";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function Profile() {
  const [userProfile, setUserProfile] = useState(() => mapUserToProfile(getStoredUser()));
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editForm, setEditForm] = useState({
    name: getStoredUser()?.name || "",
    phone: getStoredUser()?.phone || "",
  });

  const hasToken = useMemo(() => Boolean(getAuthToken()), []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!hasToken) {
        setIsLoading(false);
        setError("You are not signed in.");
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        setSuccess("");

        const response = await client.get(ENDPOINTS.PROFILE, {
          skipAuthRedirect: true,
        });
        const apiUser = response?.data?.user;

        if (apiUser) {
          setUserProfile(mapUserToProfile(apiUser));
          setEditForm({
            name: apiUser?.name || "",
            phone: apiUser?.phone || "",
          });
          setAuthSession(getAuthToken(), apiUser);
        }

        if (String(apiUser?.role || "").toLowerCase() === "student") {
          const dashboardResponse = await client.get(ENDPOINTS.STUDENT_DASHBOARD, {
            skipAuthRedirect: true,
          });
          setDashboard(dashboardResponse?.data?.data || null);
        } else {
          setDashboard(null);
        }
      } catch (fetchError) {
        const status = fetchError?.response?.status;
        const message =
          status === 401
            ? "Session could not be verified right now. Showing saved profile data."
            : fetchError?.response?.data?.message ||
              "Unable to load latest profile info. Showing saved data.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [hasToken]);

  const applications = useMemo(
    () =>
      getCombinedStudentApplications(
        dashboard?.student?.id,
        dashboard?.application_history || [],
      ),
    [dashboard?.application_history, dashboard?.student?.id],
  );

  const latestApplication = applications[0] || null;
  const renewalMeta = getRenewalMeta(latestApplication, dashboard?.student?.id);
  const parkingPermit = {
    permitId: latestApplication?.ticket?.ticket_id || "Not issued",
    permitType: userProfile.designation || "Student",
    status:
      latestApplication?.status
        ? latestApplication.is_renewal
          ? "Renewal Pending"
          : renewalMeta.lifecycleStatus || latestApplication.status
        : "No Active Application",
    zone: latestApplication?.ticket?.parking_slot || "Not assigned",
  };

  const approvedVehicles = useMemo(() => {
    const seenVehicleIds = new Set();

    return applications.filter((application) => {
      const status = String(application?.status || "").toLowerCase();
      const isApproved = status === "approved" || status === "active";
      const vehicleId = application?.vehicle?.id ?? application?.vehicle?.plate_number ?? null;

      if (!isApproved || !application?.vehicle || !vehicleId || seenVehicleIds.has(vehicleId)) {
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
  } = useClientPagination(approvedVehicles, {
    pageSize: 2,
  });

  const handleEditToggle = () => {
    if (isEditing) {
      setEditForm({
        name: userProfile.fullName === "Unknown User" ? "" : userProfile.fullName,
        phone: userProfile.phone === "Not provided" ? "" : userProfile.phone,
      });
      setSuccess("");
      setError("");
      setIsEditing(false);
      return;
    }

    setEditForm({
      name: userProfile.fullName === "Unknown User" ? "" : userProfile.fullName,
      phone: userProfile.phone === "Not provided" ? "" : userProfile.phone,
    });
    setSuccess("");
    setError("");
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
      };

      const response = await client.patch(ENDPOINTS.UPDATE_PROFILE, payload, {
        skipAuthRedirect: true,
      });

      const updatedUser = response?.data?.user;
      if (updatedUser) {
        setUserProfile(mapUserToProfile(updatedUser));
        setEditForm({
          name: updatedUser?.name || "",
          phone: updatedUser?.phone || "",
        });
        setAuthSession(getAuthToken(), updatedUser);
      }

      setSuccess(response?.data?.message || "Profile updated successfully.");
      setIsEditing(false);
    } catch (saveError) {
      const fieldError =
        saveError?.response?.data?.errors?.name?.[0] ||
        saveError?.response?.data?.errors?.phone?.[0];

      setError(
        fieldError ||
          saveError?.response?.data?.message ||
          "Failed to update your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <div className="profile-header-row">
          <h1>Campus Parking Profile</h1>
          <div className="profile-header-actions">
            <Link to="/notifications" className="action-btn tertiary-btn">
              Notifications
            </Link>
            <button
              type="button"
              className="action-btn primary-btn"
              onClick={handleEditToggle}
            >
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
          </div>
        </div>

        {isLoading ? <p className="profile-feedback">Loading profile...</p> : null}
        {error ? <p className="profile-feedback error">{error}</p> : null}
        {success ? <p className="profile-feedback success">{success}</p> : null}

        <div className="profile-grid">
          <article className="card user-card">
            <img
              className="profile-photo"
              src={userProfile.photo}
              alt={`${userProfile.fullName} profile`}
              loading="lazy"
            />
            <div className="user-details">
              {isEditing ? (
                <div className="profile-edit-form">
                  <label className="profile-field">
                    <span>Name</span>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Enter your name"
                    />
                  </label>

                  <label className="profile-field">
                    <span>Phone Number</span>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="Enter your phone number"
                    />
                  </label>

                  <div className="profile-readonly-grid">
                    <p><span>ID</span><strong>{userProfile.studentId}</strong></p>
                    <p><span>Role</span><strong>{userProfile.designation}</strong></p>
                    <p><span>Department</span><strong>{userProfile.department}</strong></p>
                    <p><span>Email</span><strong>{userProfile.email}</strong></p>
                  </div>

                  <button
                    type="button"
                    className="action-btn primary-btn profile-save-btn"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <>
                  <h2>{userProfile.fullName}</h2>
                  <p className="id-text">{userProfile.studentId}</p>
                  <p>{userProfile.designation}</p>
                  <p>{userProfile.department}</p>
                  <p>{userProfile.email}</p>
                  <p>{userProfile.phone}</p>
                </>
              )}
            </div>
          </article>

          <article className="card permit-card">
            <h3>Parking Information</h3>
            <div className="permit-list">
              <p>
                <span>Permit ID</span>
                <strong>{parkingPermit.permitId}</strong>
              </p>
              <p>
                <span>Permit Type</span>
                <strong>{parkingPermit.permitType}</strong>
              </p>
              <p>
                <span>Permit Status</span>
                <strong className={getStatusClassName(parkingPermit.status)}>
                  {parkingPermit.status}
                </strong>
              </p>
              <p>
                <span>Assigned Zone</span>
                <strong>{parkingPermit.zone}</strong>
              </p>
            </div>
          </article>
        </div>

        <section className="vehicles-section">
          <div className="vehicles-header">
            <h2>Registered Vehicles</h2>
          </div>

          {paginatedVehicles.length ? (
            <>
              <div className="vehicle-grid">
                {paginatedVehicles.map((application) => (
                  <article className="card vehicle-card" key={application.id}>
                    <h3>{formatVehicleType(application?.vehicle?.vehicle_type)}</h3>
                    <p>
                      <span>Model</span>
                      <strong>
                        {application?.vehicle?.brand || "N/A"} {application?.vehicle?.model || ""}
                      </strong>
                    </p>
                    <p>
                      <span>License Plate</span>
                      <strong>{application?.vehicle?.plate_number || "N/A"}</strong>
                    </p>
                    <p>
                      <span>Color</span>
                      <strong>{application?.vehicle?.color || "N/A"}</strong>
                    </p>
                    <p>
                      <span>Status</span>
                      <strong className={getStatusClassName(application?.status)}>
                        {application?.status || "N/A"}
                      </strong>
                    </p>
                    <p>
                      <span>Permit</span>
                      <strong>{application?.ticket?.ticket_id || "Not issued"}</strong>
                    </p>
                  </article>
                ))}
              </div>
              <PaginationControls
                currentPage={currentPage}
                itemLabel="approved vehicles"
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
              />
            </>
          ) : (
            <div className="card vehicle-empty-state">
              Only vehicles linked to approved or active permits are shown here.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
