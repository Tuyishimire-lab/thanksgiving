"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function Share() {
  const [formLoaded, setFormLoaded] = useState(false);

  useEffect(() => {
    // Check if the script is loaded and hbspt is globally available
    if (formLoaded && typeof window !== "undefined" && window.hbspt) {
      // Clear container in case of multiple renders
      const container = document.getElementById("hubspot-form-container");
      if (container) {
        container.innerHTML = "";
      }
      
      window.hbspt.forms.create({
        region: "eu1",
        portalId: "143791372",
        formId: "14e8d2fb-ebf5-47ab-933c-a8165b61a30c",
        target: "#hubspot-form-container",
        css: "",
        cssClass: "your-custom-class"
      });
    }
  }, [formLoaded]);

  return (
    <>
      {/* Load Hubspot forms script */}
      <Script
        src="https://js-eu1.hsforms.net/forms/embed/v2.js"
        strategy="afterInteractive"
        onLoad={() => setFormLoaded(true)}
      />

      <div className="section" style={{ paddingBlock: "6rem 4rem" }}>
        <div className="container" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="share-title" style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h3 style={{ fontSize: "var(--font-size-lg)", color: "var(--light-color)", marginBottom: "1rem" }}>
              Share Your Testimony
            </h3>
            <em style={{ fontSize: "1.8rem", color: "var(--light-color-alt)", display: "block", marginBottom: "1rem" }}>
              We believe in the power of stories.
            </em>
            <p style={{ fontSize: "1.5rem", color: "var(--light-color-alt)" }}>
              Share your Thanksgiving reflection and touch the hearts of others on our website.
            </p>
          </div>

          <div 
            id="hubspot-form-container" 
            style={{
              background: "var(--secondary-background-color)",
              padding: "4rem 3rem",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
              minHeight: "300px",
              transition: "background-color 0.25s"
            }}
          >
            {!formLoaded && (
              <div className="place-items-center" style={{ width: "100%", height: "200px", color: "var(--light-color-alt)" }}>
                Loading testimony submission portal...
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
