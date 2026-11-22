"use client";

import { useState } from "react";

export default function Contacts() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Contact submission:", formData);
    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <section className="sanc-page">
      <div className="sanc-container-md">
        <div className="sanc-hero">
          <span className="sanc-eyebrow">Connect With Us</span>
          <h1 className="sanc-title">
            Reach Out to <span className="sanc-title-accent">Ju &amp;</span> Vicky
          </h1>
          <p className="sanc-subtitle">
            Share questions, prayer reflections, ministry collaborations, or feedback anytime.
          </p>
        </div>

        <div className="sanc-grid-2" style={{ alignItems: "start" }}>
          <div className="sanc-card sanc-card-pad sanc-stack" style={{ gap: "2rem" }}>
            <div>
              <span className="sanc-eyebrow">Founders</span>
              <h2 className="sanc-section-title" style={{ marginBottom: "0.9rem" }}>
                Justine &amp; Victorien
              </h2>
              <p style={{ fontSize: "1.42rem", lineHeight: 1.7, color: "var(--sanc-muted)", margin: 0 }}>
                We are passionate about faith, hope, and living testimonies of how the Lord works
                in everyday life. Feel free to write to us with questions, reflections, or
                cooperation requests.
              </p>
            </div>

            <div className="sanc-stack" style={{ gap: "1.4rem", paddingBlock: "1.4rem", borderTop: "1px solid var(--sanc-border)", borderBottom: "1px solid var(--sanc-border)" }}>
              <div className="sanc-info-row">
                <div className="sanc-info-icon">
                  <i className="ri-mail-line" aria-hidden="true"></i>
                </div>
                <div>
                  <span className="sanc-label" style={{ display: "block", marginBottom: "0.2rem" }}>
                    Email Us
                  </span>
                  <a
                    href="mailto:tuyishime1angel@gmail.com"
                    style={{ fontSize: "1.45rem", fontWeight: 600, color: "var(--sanc-text)" }}
                  >
                    tuyishime1angel@gmail.com
                  </a>
                </div>
              </div>

              <div className="sanc-info-row">
                <div className="sanc-info-icon">
                  <i className="ri-map-pin-line" aria-hidden="true"></i>
                </div>
                <div>
                  <span className="sanc-label" style={{ display: "block", marginBottom: "0.2rem" }}>
                    Our Location
                  </span>
                  <span style={{ fontSize: "1.45rem", fontWeight: 600, color: "var(--sanc-text)" }}>
                    Kigali, Rwanda
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span className="sanc-label" style={{ display: "block", marginBottom: "1rem" }}>
                Follow PraisePage
              </span>
              <div className="sanc-social-row">
                <a
                  href="https://www.instagram.com/praisepage__?igsh=czB1MWpndDM5dmxl"
                  className="sanc-social-btn"
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="ri-instagram-line" aria-hidden="true"></i>
                </a>
                <a
                  href="https://www.facebook.com/share/17UGpy6s6P/"
                  className="sanc-social-btn"
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="ri-facebook-circle-line" aria-hidden="true"></i>
                </a>
                <a
                  href="https://x.com/praisepage_"
                  className="sanc-social-btn"
                  aria-label="X (Twitter)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="ri-twitter-line" aria-hidden="true"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="sanc-card sanc-card-pad">
            {submitted ? (
              <div className="sanc-stack" style={{ alignItems: "center", textAlign: "center", paddingBlock: "2.4rem", gap: "1.5rem" }}>
                <div className="sanc-stat-icon emerald" style={{ width: "6.4rem", height: "6.4rem", borderRadius: "50%" }}>
                  <i className="ri-checkbox-circle-line" style={{ fontSize: "3.2rem" }} aria-hidden="true"></i>
                </div>
                <div className="sanc-alert ok" role="status">
                  <span>Thank you for reaching out. Your message has been received and we will respond shortly.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="sanc-btn-secondary"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="sanc-stack" style={{ gap: "1.65rem" }}>
                <div>
                  <span className="sanc-eyebrow">Direct Note</span>
                  <h2 className="sanc-section-title">Send a Message</h2>
                </div>

                <div className="sanc-field">
                  <label htmlFor="name" className="sanc-label">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="sanc-input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="sanc-field">
                  <label htmlFor="email" className="sanc-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="sanc-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="sanc-field">
                  <label htmlFor="subject" className="sanc-label">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="sanc-input"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="sanc-field">
                  <label htmlFor="message" className="sanc-label">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    className="sanc-textarea"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                  />
                </div>

                <button type="submit" className="sanc-btn-primary" style={{ width: "100%" }}>
                  <i className="ri-send-plane-line" aria-hidden="true"></i>
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
