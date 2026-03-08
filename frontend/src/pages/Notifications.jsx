import "./notifications.css";

const permissionDetails = [
  {
    label: "Owner",
    value: "Premio",
    updatedAt: "April 10, 2025 11:30 AM",
  },
  {
    label: "Plate",
    value: "ABC-3835",
    updatedAt: "April 10, 2025 11:30 AM",
  },
  {
    label: "Role",
    value: "Student",
    updatedAt: "April 10, 2025 11:30 AM",
  },
];

const latestUpdates = [
  { status: "Declined", time: "December 15, 2025 - 12:43 PM" },
  { status: "Pending Review", time: "January 15, 2026 - 9:20 AM" },
  { status: "Submitted", time: "January 14, 2026 - 5:22 PM" },
  { status: "Updated", time: "January 10, 2026 - 2:10 PM" },
];

const statusFlow = [
  { label: "Submitted", state: "completed", hint: "Application received" },
  { label: "In Review", state: "current", hint: "Under admin verification" },
  { label: "Approved", state: "future", hint: "Permit will be issued" },
];

const updateStatusTone = {
  Submitted: "submitted",
  "Pending Review": "pending",
  Approved: "approved",
  Declined: "declined",
  Updated: "updated",
};

export default function Notifications() {
  const currentStep = statusFlow.find((step) => step.state === "current")?.label || "Unknown";

  return (
    <div className="ntf-page">
      <main className="ntf-shell">
        <header className="ntf-top">
          <p className="ntf-eyebrow">Parking Activity Center</p>
          <h1>Notifications</h1>
          <p className="ntf-subtitle">
            Track parking permission details and stay updated on recent request activity.
          </p>
          <span className="ntf-live-pill">Live Status Feed</span>
        </header>

        <section className="ntf-card ntf-track-card">
          <h2 className="ntf-track-title">Status</h2>
          <p className="ntf-track-subtitle">Track your semester parking application status</p>
          <div className="ntf-current-banner" aria-live="polite">
            <span className="ntf-current-banner-label">Current Stage</span>
            <strong>{currentStep}</strong>
          </div>

          <div className="ntf-track-flow" role="list" aria-label="Application status flow">
            {statusFlow.map((step, index) => (
              <div key={step.label} className={`ntf-track-item-wrap ntf-track-wrap--${step.state}`}>
                <article
                  className={`ntf-track-item ntf-track-item--${step.state}`}
                  role="listitem"
                  aria-current={step.state === "current" ? "step" : undefined}
                >
                  <span className={`ntf-track-badge ntf-track-badge--${step.state}`}>
                    {step.state === "completed"
                      ? "Completed"
                      : step.state === "current"
                        ? "Current"
                        : "Upcoming"}
                  </span>
                  <p className="ntf-track-item-label">{step.label}</p>
                  <p className="ntf-track-item-hint">{step.hint}</p>
                </article>

                {index !== statusFlow.length - 1 ? (
                  <div className="ntf-track-arrow" aria-hidden="true">
                    <span className="ntf-track-arrow-line" />
                    <span className="ntf-track-arrow-head" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="ntf-card">
          <h2 className="ntf-card-title">Permission Details</h2>

          <div className="ntf-head ntf-head-permission">
            <p>Label</p>
            <p>Value</p>
            <p>Timestamp</p>
          </div>

          <div className="ntf-rows">
            {permissionDetails.map((item) => (
              <article key={item.label} className="ntf-row ntf-row-permission">
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Label</p>
                  <p className="ntf-label-value">{item.label}</p>
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Value</p>
                  <p className="ntf-main-value">{item.value}</p>
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Timestamp</p>
                  <p className="ntf-time-value">{item.updatedAt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ntf-card ntf-card-updates">
          <h2 className="ntf-card-title">Latest Updates</h2>

          <div className="ntf-head ntf-head-updates">
            <p>Status</p>
            <p>Timestamp</p>
          </div>

          <div className="ntf-rows">
            {latestUpdates.map((update, index) => (
              <article key={`${update.status}-${update.time}`} className="ntf-row ntf-row-updates ntf-timeline-row">
                <div className="ntf-timeline-rail" aria-hidden="true">
                  <span
                    className={`ntf-timeline-dot ntf-status--${updateStatusTone[update.status] || "updated"}`}
                  />
                  {index !== latestUpdates.length - 1 ? <span className="ntf-timeline-line" /> : null}
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Status</p>
                  <span className={`ntf-status ntf-status--${updateStatusTone[update.status] || "updated"}`}>
                    <span className="ntf-chip-dot" aria-hidden="true" />
                    {update.status}
                  </span>
                </div>
                <div className="ntf-cell">
                  <p className="ntf-mobile-label">Timestamp</p>
                  <p className="ntf-time-value">{update.time}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
