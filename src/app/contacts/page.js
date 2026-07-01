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
    <section className="section" style={{ paddingBlock: "6rem 4rem" }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        <h2 className="title section-title" data-name="Connect">
          Contact Us
        </h2>

        <div className="d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "4rem", marginTop: "4rem" }}>
          {/* Author/Company Information Card */}
          <div
            style={{
              background: "var(--secondary-background-color)",
              padding: "4rem 3rem",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "2.5rem"
            }}
          >
            <div>
              <h3 style={{ fontSize: "2.2rem", color: "var(--light-color)", marginBottom: "1.5rem" }}>
                Ju & Vicky
              </h3>
              <p style={{ lineHeight: "1.6", color: "var(--light-color-alt)" }}>
                We are Justine and Victorien, We are passionate about faith, hope, and testimonies of how the Lord works in modern lives. Feel free to reach out to us with any questions, reflections, or cooperation requests!
              </p>
            </div>

            <hr style={{ border: "0", height: "1px", background: "var(--transparent-light-color)" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div
                  className="place-items-center"
                  style={{
                    width: "4.5rem",
                    height: "4.5rem",
                    borderRadius: "50%",
                    background: "var(--transparent-light-color)",
                    color: "var(--light-color)"
                  }}
                >
                  <i className="ri-mail-line" style={{ fontSize: "1.8rem" }}></i>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "1.2rem", color: "var(--light-color-alt)" }}>EMAIL US</span>
                  <a href="mailto:hello@praisepage.com" style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--light-color)" }}>
                    hello@praisepage.com
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div
                  className="place-items-center"
                  style={{
                    width: "4.5rem",
                    height: "4.5rem",
                    borderRadius: "50%",
                    background: "var(--transparent-light-color)",
                    color: "var(--light-color)"
                  }}
                >
                  <i className="ri-map-pin-line" style={{ fontSize: "1.8rem" }}></i>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "1.2rem", color: "var(--light-color-alt)" }}>OUR LOCATION</span>
                  <span style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--light-color)" }}>
                    Kigali, Rwanda
                  </span>
                </div>
              </div>
            </div>

            <hr style={{ border: "0", height: "1px", background: "var(--transparent-light-color)" }} />

            <div>
              <span style={{ display: "block", fontSize: "1.3rem", color: "var(--light-color-alt)", marginBottom: "1rem" }}>
                FOLLOW US ON
              </span>
              <ul className="list social-media" style={{ justifyContent: "flex-start", gap: "1.5rem" }}>
                <li className="list-item">
                  <a href="#" className="list-link" aria-label="Instagram">
                    <i className="ri-instagram-line"></i>
                  </a>
                </li>
                <li className="list-item">
                  <a href="#" className="list-link" aria-label="Facebook">
                    <i className="ri-facebook-circle-line"></i>
                  </a>
                </li>
                <li className="list-item">
                  <a href="#" className="list-link" aria-label="Twitter">
                    <i className="ri-twitter-line"></i>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form Card */}
          <div
            style={{
              background: "var(--secondary-background-color)",
              padding: "4rem 3rem",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)"
            }}
          >
            {submitted ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                <div
                  className="place-items-center"
                  style={{
                    width: "8rem",
                    height: "8rem",
                    borderRadius: "50%",
                    background: "var(--gradient-color)",
                    color: "#fff",
                    margin: "0 auto 2.5rem",
                    fontSize: "4rem"
                  }}
                >
                  <i className="ri-checkbox-circle-line"></i>
                </div>
                <h3 style={{ fontSize: "2.4rem", color: "var(--light-color)", marginBottom: "1rem" }}>
                  Message Sent!
                </h3>
                <p style={{ color: "var(--light-color-alt)", fontSize: "1.5rem" }}>
                  Thank you for reaching out. We have received your message and will get back to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    marginTop: "3rem",
                    border: "2px solid var(--light-color)",
                    padding: "1rem 2.5rem",
                    borderRadius: "30px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                <h3 style={{ fontSize: "2.2rem", color: "var(--light-color)", marginBottom: "1rem" }}>
                  Send a Message
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="name" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="email" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="subject" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>
                    SUBJECT
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="message" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>
                    MESSAGE
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="5"
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none",
                      resize: "vertical"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: "var(--accent-color)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "30px",
                    padding: "1.5rem",
                    fontSize: "1.6rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "opacity 0.25s",
                    textAlign: "center"
                  }}
                  onMouseOver={(e) => (e.target.style.opacity = 0.9)}
                  onMouseOut={(e) => (e.target.style.opacity = 1)}
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
