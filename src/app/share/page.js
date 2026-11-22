"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function Share() {
  const [formLoaded, setFormLoaded] = useState(false);

  useEffect(() => {
    if (formLoaded && typeof window !== "undefined" && window.hbspt) {
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
        cssClass: "your-custom-class",
      });
    }
  }, [formLoaded]);

  return (
    <>
      <Script
        src="https://js-eu1.hsforms.net/forms/embed/v2.js"
        strategy="afterInteractive"
        onReady={() => setFormLoaded(true)}
      />

      <section className="sanc-page">
        <div className="sanc-container-sm">
          <div className="sanc-hero sanc-hero-center">
            <span className="sanc-eyebrow">Submit a Reflection</span>
            <h1 className="sanc-title">Share Your Testimony</h1>
            <p className="sanc-subtitle" style={{ marginInline: "auto" }}>
              <em>We believe in the power of stories.</em> Share your PraisePage reflection and
              encourage hearts around the world.
            </p>
          </div>

          <div className="sanc-card sanc-card-pad" style={{ minHeight: "30rem" }}>
            {!formLoaded && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "20rem",
                  color: "var(--sanc-muted)",
                  fontSize: "1.4rem",
                }}
              >
                Loading testimony submission portal...
              </div>
            )}
            <div id="hubspot-form-container" />
          </div>
        </div>
      </section>
    </>
  );
}
