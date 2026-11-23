export const metadata = {
  title: "Privacy Policy",
  description:
    "Learn how PraisePage collects, uses, protects, and handles your sensitive user and device data in accordance with Google Play Store guidelines.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicy() {
  return (
    <section className="sanc-page">
      <div className="sanc-container-sm">
        <div className="sanc-hero">
          <span className="sanc-eyebrow">Legal &amp; Trust</span>
          <h1 className="sanc-title">Privacy Policy</h1>
          <p className="sanc-subtitle">Last Updated: July 9, 2026</p>
        </div>

        <div className="sanc-card sanc-card-pad">
          <div className="sanc-article-prose">
            <p>
              Welcome to <strong>PraisePage</strong>. We are committed to protecting your personal
              privacy and ensuring that your sensitive user and device data is treated with the
              highest standards of transparency and security.
            </p>
            <p>
              This Privacy Policy explains what information we collect, how we use it, and the
              rights you have regarding your data when using our website and mobile application.
            </p>

            <hr />

            <h2>1. Information We Collect</h2>
            <p>
              To provide a meaningful community experience, we collect the following types of
              information:
            </p>
            <ul>
              <li>
                <strong>Account Information:</strong> When you register or sign up for PraisePage,
                we collect your name, email address, and a secure hash of your password.
              </li>
              <li>
                <strong>User-Generated Content:</strong> We store the testimonies, prayers,
                reflections, and encouragements you explicitly choose to write and post to the
                community feed or prayer wall.
              </li>
              <li>
                <strong>Faith Footprints &amp; Progress:</strong> We track your active devotional
                plans, streak counts, and badges earned to help you visualize your spiritual walk.
              </li>
              <li>
                <strong>Device &amp; Push Notification Data:</strong> If you opt-in to receive
                daily verses or prayer reminders via our Progressive Web App (PWA), we securely
                store your PWA push subscription token.
              </li>
              <li>
                <strong>Technical &amp; Usage Data:</strong> We collect basic analytics data (such
                as page views, browser type, and country location) via Google Analytics to monitor
                and improve our services.
              </li>
            </ul>

            <hr />

            <h2>2. How We Use Your Information</h2>
            <p>We process your user and device data strictly for the following purposes:</p>
            <ul>
              <li>To operate, maintain, and provide the core features of the PraisePage platform.</li>
              <li>To securely authenticate your account and customize your user profile.</li>
              <li>To deliver daily verses or custom notifications when you subscribe to them.</li>
              <li>To monitor site performance, identify bugs, and improve the user experience.</li>
            </ul>

            <hr />

            <h2>3. Data Sharing &amp; Third-Party Disclosure</h2>
            <p>
              <strong>We do not sell, trade, or rent your personal data to any third parties.</strong>
            </p>
            <p>
              Public testimonies, comments, and public prayer requests are visible to all
              registered users on the PraisePage platform. Private journaling notes or private
              plans remain strictly confidential to your account.
            </p>

            <hr />

            <h2>4. Security and Data Retention</h2>
            <p>We implement robust security measures to protect your sensitive data:</p>
            <ul>
              <li>
                All communication between your device and our servers is encrypted using standard
                Secure Socket Layer (SSL/HTTPS) protocols.
              </li>
              <li>
                Passwords are securely hashed using modern cryptographic algorithms before saving to
                the database.
              </li>
              <li>
                We store your personal data only as long as your account exists or is active.
              </li>
            </ul>

            <hr />

            <h2>5. Your Rights and Data Erasure</h2>
            <p>
              We believe you should have full control over your personal data. You have the
              following rights:
            </p>
            <ul>
              <li>
                <strong>Access &amp; Edit:</strong> You can view and edit your profile details
                directly from the Profile page.
              </li>
              <li>
                <strong>Content Deletion:</strong> You can delete any testimony, comment, or prayer
                request you have created directly from the user interface.
              </li>
              <li>
                <strong>Complete Account &amp; Data Erasure:</strong> You can request the complete
                and permanent deletion of your account and all associated data at any time. To
                request data deletion, please contact us at{" "}
                <a href="mailto:tuyishime1angel@gmail.com">tuyishime1angel@gmail.com</a>. We will
                process and confirm your erasure request within 48 hours.
              </li>
            </ul>

            <hr />

            <h2>6. Contact Us</h2>
            <p>
              If you have any questions or feedback regarding this Privacy Policy, please feel free
              to reach out to us:
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:tuyishime1angel@gmail.com">tuyishime1angel@gmail.com</a>
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong>Developers:</strong> Ju &amp; Vicky (Kigali, Rwanda)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
