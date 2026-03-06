import { useState } from "react";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import "./Contact.css";

const authorityEmail =
  import.meta.env.VITE_AUTHORITY_EMAIL?.trim() || "authority@example.com";

export default function Contact() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Full name cannot be empty.");
      return;
    }

    if (!email.trim()) {
      setError("Email address cannot be empty.");
      return;
    }

    if (!subject.trim()) {
      setError("Subject cannot be empty.");
      return;
    }

    if (!message.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await client.post(ENDPOINTS.CONTACT, {
        full_name: fullName.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess(
        response?.data?.message ||
          "Your message has been sent successfully. Our team will respond shortly."
      );
      setFullName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          "Failed to send your message. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="contact-page">
      <section className="contact-wrapper">
        <header className="contact-header">
          <h1>Contact Us</h1>
          <p>
            If you have any questions, suggestions, or issues regarding our
            platform, feel free to contact our team. We will get back to you as
            soon as possible.
          </p>
          <p className="contact-authority">
            Messages are sent to: <strong>{authorityEmail}</strong>
          </p>
        </header>

        <section className="contact-card">
          {error ? <p className="contact-feedback error">{error}</p> : null}
          {success ? <p className="contact-feedback success">{success}</p> : null}

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <label className="form-field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                />
              </label>

              <label className="form-field">
                <span>Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your-email@example.com"
                />
              </label>
            </div>

            <label className="form-field">
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Enter subject"
              />
            </label>

            <label className="form-field">
              <span>Message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message here..."
                rows={7}
              />
            </label>

            <button type="submit" disabled={isSubmitting} className="send-btn">
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
