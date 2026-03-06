import "./ApplyParking.css";
import { Link } from "react-router-dom";

export default function ApplyParking() {
  const uploadItems = [
    "Vehicle Registration Certificate",
    "Driving License",
    "University ID Card",
    "Vehicle Photo",
  ];

  return (
    <div className="apply-page">
      <div className="apply-shell">
        <div className="apply-topbar">
          <Link to="/profile" className="back-btn">
            Back to Profile
          </Link>
        </div>
        <h1 className="apply-title">Parking Registration Form</h1>

        <form className="apply-form">
          <div className="apply-top-grid">
            <section className="apply-section">
              <h2>Applicant Information</h2>

              <div className="register-group">
                <p>Register Type</p>
                <div className="register-options">
                  {["Student", "Faculty", "Admin"].map((role) => (
                    <label key={role} className="radio-row">
                      <input type="radio" name="registerAs" />
                      <span>{`Register As ${role}`}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field-grid">
                {["Name", "AUST ID", "Semester", "Email", "Contact Phone"].map(
                  (field) => (
                    <label key={field} className="field">
                      <span>{field}</span>
                      <input
                        type={field === "Email" ? "email" : "text"}
                        placeholder={`Enter ${field.toLowerCase()}`}
                      />
                    </label>
                  ),
                )}
              </div>
            </section>

            <section className="apply-section">
              <h2>Vehicle Info</h2>

              <div className="field-grid">
                {[
                  "Vehicle Plate",
                  "Vehicle Model",
                  "Vehicle Color",
                  "Vehicle Brand",
                  "Registration Number",
                ].map((field) => (
                  <label key={field} className="field">
                    <span>{field}</span>
                    <input
                      type="text"
                      placeholder={`Enter ${field.toLowerCase()}`}
                    />
                  </label>
                ))}

                <label className="field">
                  <span>Notes (Optional)</span>
                  <textarea
                    rows={4}
                    placeholder="Add any necessary notes"
                  />
                </label>
              </div>
            </section>
          </div>

          <section className="apply-section">
            <h2>Document Uploads</h2>

            <div className="uploads-grid">
              {uploadItems.map((item) => (
                <label key={item} className="upload-control">
                  <input type="file" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="apply-actions">
            <button type="submit" className="submit-btn">
              Submit
            </button>

            <label className="nda-row">
              <input type="checkbox" />
              <span>I want to proceed by also signing an NDA</span>
            </label>
          </div>
        </form>
      </div>
    </div>
  );
}
