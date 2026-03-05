import { Link } from "react-router-dom";
import "./about.css";

const teamMembers = [
  {
    name: "Abdul Mumit Sazid",
    role: "Backend Developer",
    image: "https://i.pravatar.cc/300?img=12",
    bio: "Abdul specializes in backend architecture and database management. He is responsible for developing secure APIs and ensuring that the system handles data efficiently and reliably.",
    linkedin: "#",
    github: "#",
  },
  {
    name: "Masrafi Iqbal",
    role: "Frontend Developer",
    image: "https://i.pravatar.cc/300?img=32",
    bio: "Masrafi focuses on creating responsive and user-friendly interfaces. She ensures that users have a smooth and intuitive experience when interacting with the system.",
    linkedin: "#",
    github: "#",
  },
  {
    name: "Samiul Islam",
    role: "DevOps Engineer",
    image: "https://i.pravatar.cc/300?img=52",
    bio: "Samiul manages the infrastructure and deployment pipelines. He ensures the system runs reliably using containerization technologies such as Docker and cloud services.",
    linkedin: "#",
    github: "#",
  },
  {
    name: "Mirazum Munira Mahi",
    role: "UI/UX Designer",
    image: "https://i.pravatar.cc/300?img=44",
    bio: "Mahi designs the visual experience of the platform. She focuses on usability, accessibility, and modern design principles to make the platform attractive and easy to use.",
    linkedin: "#",
    github: "#",
  },
];

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.94 8.6H3.56V20h3.38V8.6zM5.25 7.18c1.08 0 1.96-.9 1.96-2s-.88-1.98-1.96-1.98-1.95.9-1.95 1.98.87 2 1.95 2zm14.75 6.27c0-3.07-1.64-4.5-3.83-4.5-1.77 0-2.57.97-3.01 1.65V8.6H9.78c.04 1.33 0 11.4 0 11.4h3.38v-6.37c0-.34.02-.68.12-.92.27-.68.88-1.4 1.9-1.4 1.34 0 1.88 1.03 1.88 2.53V20H20v-6.55z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.6 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.25-.01-.9-.01-1.77-2.78.62-3.37-1.37-3.37-1.37-.46-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .08 1.54 1.06 1.54 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.74 0 0 .84-.27 2.75 1.05A9.29 9.29 0 0 1 12 6.87c.85 0 1.72.12 2.53.37 1.9-1.32 2.74-1.05 2.74-1.05.55 1.43.21 2.48.1 2.74.64.72 1.03 1.64 1.03 2.76 0 3.93-2.34 4.8-4.58 5.06.36.32.68.95.68 1.92 0 1.38-.01 2.49-.01 2.83 0 .28.18.61.69.5A10.25 10.25 0 0 0 22 12.26C22 6.6 17.52 2 12 2z" />
    </svg>
  );
}

export default function About() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-container">
          <p className="about-kicker">About ParKar</p>
          <h1>About Us</h1>
          <p className="about-intro">
            We are a passionate team of developers dedicated to building secure,
            reliable, and user-friendly digital solutions. Our goal is to simplify
            financial management through modern technology and intuitive design.
          </p>
          <div className="about-hero-actions">
            <Link to="/" className="about-btn about-btn-primary">
              Back to Home
            </Link>
            <a href="#team" className="about-btn about-btn-ghost">
              Meet the Team
            </a>
          </div>
        </div>
      </section>

      <section className="about-mission">
        <div className="about-container">
          <div className="about-mission-card">
            <h2>Our Mission & Vision</h2>
            <p>
              Our mission is to create efficient digital systems that improve
              accessibility, security, and convenience for users managing
              financial services online.
            </p>
            <p>
              We envision a future where digital financial experiences are simple,
              transparent, and trusted by everyone.
            </p>
          </div>
        </div>
      </section>

      <section id="team" className="about-team">
        <div className="about-container">
          <h2>Team Members</h2>
          <p className="about-team-subtitle">
            The people behind the platform.
          </p>
          <div className="about-team-grid">
            {teamMembers.map((member) => (
              <article className="about-team-card" key={member.name}>
                <img
                  src={member.image}
                  alt={member.name}
                  className="about-team-photo"
                  loading="lazy"
                />
                <h3>{member.name}</h3>
                <p className="about-team-role">{member.role}</p>
                <p className="about-team-bio">{member.bio}</p>
                <div className="about-team-socials">
                  <a href={member.linkedin} aria-label={`${member.name} LinkedIn`}>
                    <LinkedInIcon />
                  </a>
                  <a href={member.github} aria-label={`${member.name} GitHub`}>
                    <GitHubIcon />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="about-container about-cta-inner">
          <div>
            <h2>Want to work with us?</h2>
            <p>
              Join our mission to build secure and modern digital solutions for
              real-world users.
            </p>
          </div>
          <Link to="/register" className="about-btn about-btn-primary">
            Contact Us
          </Link>
        </div>
      </section>
    </main>
  );
}
