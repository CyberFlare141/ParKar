import { Link } from "react-router-dom";
import "./about.css";

const teamMembers = [
  {
    name: "Abdul Mumit Sazid",
    role: "Backend Developer",
    image: "https://i.pravatar.cc/300?img=12",
    bio: "Abdul specializes in backend architecture and database management. He is responsible for developing secure APIs and ensuring that the system handles data efficiently and reliably.",
    github: "#",
  },
  {
    name: "Ayesha Rahman",
    role: "Frontend Developer",
    image: "https://i.pravatar.cc/300?img=47",
    bio: "Ayesha focuses on creating responsive and user-friendly interfaces. She ensures that users have a smooth and intuitive experience when interacting with the system.",
    github: "#",
  },
  {
    name: "Tanvir Hasan",
    role: "DevOps Engineer",
    image: "https://i.pravatar.cc/300?img=33",
    bio: "Tanvir manages the infrastructure and deployment pipelines. He ensures the system runs reliably using containerization technologies such as Docker and cloud services.",
    github: "#",
  },
  {
    name: "Nusrat Jahan",
    role: "UI/UX Designer",
    image: "https://i.pravatar.cc/300?img=5",
    bio: "Nusrat designs the visual experience of the platform. She focuses on usability, accessibility, and modern design principles to make the platform attractive and easy to use.",
    github: "#",
  },
];

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
        </div>
      </section>

      <section className="about-mission">
        <div className="about-container">
          <article className="about-mission-card">
            <h2>Our Mission & Vision</h2>
            <p>
              Our mission is to create efficient digital systems that improve
              accessibility, security, and convenience for users managing financial
              services online.
            </p>
            <p>
              We envision a future where digital financial experiences are simple,
              transparent, and trusted by everyone.
            </p>
          </article>
        </div>
      </section>

      <section className="about-team">
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
                <a href={member.github} className="about-team-github" aria-label={`${member.name} GitHub`}>
                  <GitHubIcon />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="about-container about-cta-inner">
          <div>
            <h2>Need to reach our team?</h2>
            <p>Share your questions, suggestions, or platform issues with us.</p>
          </div>
          <Link to="/contact" className="about-cta-btn">
            Contact Us
          </Link>
        </div>
      </section>
    </main>
  );
}
