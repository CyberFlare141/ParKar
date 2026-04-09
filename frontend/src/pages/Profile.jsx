import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { getAuthToken, getAuthUser, setAuthSession } from "../auth/session";
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
    fullName,
    studentId: user?.university_id || "Not provided",
    designation,
    department: user?.department || "Not provided",
    email: user?.email || "Not provided",
    phone: user?.phone || "Not provided",
    photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName
    )}&background=0f4cbd&color=ffffff`,
  };
}

function getStatusClassName(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "active") {
    return "status-tag status-active";
  }

  if (normalized.includes("pending")) {
    return "status-tag status-pending";
  }

  return "status-tag status-expired";
}

const vehicles = [
  {
    id: 1,
    type: "Car",
    model: "Toyota Corolla 2022",
    plate: "BDK-4821",
    color: "White",
    status: "Registered",
  },
  {
    id: 2,
    type: "Bike",
    model: "Yamaha FZ-S V3",
    plate: "BKE-9034",
    color: "Blue",
    status: "Registered",
  },
  {
    id: 3,
    type: "Scooter",
    model: "Honda Dio 125",
    plate: "SCT-3370",
    color: "Red",
    status: "Pending Renewal",
  },
];

export default function Profile() {
  const [userProfile, setUserProfile] = useState(() =>
    mapUserToProfile(getStoredUser())
  );
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
        const response = await client.get(ENDPOINTS.PROFILE, {
          skipAuthRedirect: true,
        });
        const apiUser = response?.data?.user;
        if (apiUser) {
          setUserProfile(mapUserToProfile(apiUser));
          setAuthSession(getAuthToken(), apiUser);
        }

        if (String(apiUser?.role || "").toLowerCase() === "student") {
          const dashboardResponse = await client.get(ENDPOINTS.STUDENT_DASHBOARD, {
            skipAuthRedirect: true,
          });
          setDashboard(dashboardResponse?.data?.data || null);
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

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <div className="profile-header-row">
          <h1>Campus Parking Profile</h1>
          <div className="profile-header-actions">
            <Link to="/notifications" className="action-btn tertiary-btn">
              Notifications
            </Link>
            <button type="button" className="action-btn primary-btn">
              Edit Profile
            </button>
          </div>
        </div>
        {isLoading ? <p className="profile-feedback">Loading profile...</p> : null}
        {error ? <p className="profile-feedback error">{error}</p> : null}

        <div className="profile-grid">
          <article className="card user-card">
            <img
              className="profile-photo"
              src={userProfile.photo}
              alt={`${userProfile.fullName} profile`}
              loading="lazy"
            />
            <div className="user-details">
              <h2>{userProfile.fullName}</h2>
              <p className="id-text">{userProfile.studentId}</p>
              <p>{userProfile.designation}</p>
              <p>{userProfile.department}</p>
              <p>{userProfile.email}</p>
              <p>{userProfile.phone}</p>
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
                <strong
                  className={getStatusClassName(parkingPermit.status)}
                >
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
            <button type="button" className="action-btn secondary-btn">
              Add New Vehicle
            </button>
          </div>

          <div className="vehicle-grid">
            {vehicles.map((vehicle) => (
              <article className="card vehicle-card" key={vehicle.id}>
                <h3>{vehicle.type}</h3>
                <p>
                  <span>Model</span>
                  <strong>{vehicle.model}</strong>
                </p>
                <p>
                  <span>License Plate</span>
                  <strong>{vehicle.plate}</strong>
                </p>
                <p>
                  <span>Color</span>
                  <strong>{vehicle.color}</strong>
                </p>
                <p>
                  <span>Status</span>
                  <strong
                    className={
                      vehicle.status === "Registered"
                        ? "status-tag status-active"
                        : "status-tag status-expired"
                    }
                  >
                    {vehicle.status}
                  </strong>
                </p>
                <div className="vehicle-actions">
                  <button type="button" className="action-btn tertiary-btn">
                    Edit
                  </button>
                  <button type="button" className="action-btn danger-btn">
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
