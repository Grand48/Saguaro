export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.7 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, background: "#1a9e4a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 20 }}>🌵</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1a9e4a" }}>Saguaro</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>Privacy Policy</h1>
        <p style={{ color: "#666", margin: 0 }}>Last updated: April 18, 2026</p>
      </div>

      <p>Grand48 ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the Saguaro field crew management app.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Information We Collect</h2>
      <p>We collect the following types of information to provide and improve our services:</p>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
        <li><strong>Profile Information:</strong> Job title, phone number, and profile photo if provided.</li>
        <li><strong>Location Data:</strong> GPS location when you use time clock check-in features (only with your permission).</li>
        <li><strong>Photos:</strong> Images you upload to document job sites or work completed.</li>
        <li><strong>Usage Data:</strong> Information about how you use the app, including features accessed and time spent.</li>
        <li><strong>Device Information:</strong> Device type, operating system, and app version.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>How We Use Your Information</h2>
      <ul>
        <li>To provide and operate the Saguaro platform and its features</li>
        <li>To facilitate crew scheduling, job management, and team communication</li>
        <li>To process subscription payments through RevenueCat and Apple/Google payment systems</li>
        <li>To send notifications about jobs, schedules, and app updates</li>
        <li>To improve our services and develop new features</li>
        <li>To respond to your support requests</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Information Sharing</h2>
      <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
      <ul>
        <li><strong>Within your organization:</strong> Information is shared with your employer and fellow crew members as part of the app's core functionality.</li>
        <li><strong>Service providers:</strong> We use trusted third-party services (including RevenueCat for subscription management) that process data only on our behalf.</li>
        <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect our rights and safety.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Data Security</h2>
      <p>We use industry-standard security measures to protect your information, including encrypted data transmission (HTTPS/TLS) and secure server infrastructure. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access and download your personal data</li>
        <li>Correct inaccurate information</li>
        <li>Delete your account and associated data</li>
        <li>Opt out of non-essential communications</li>
      </ul>
      <p>To exercise any of these rights, contact us at the email below.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Data Retention</h2>
      <p>We retain your data for as long as your account is active or as needed to provide services. If you delete your account, we will delete your personal data within 30 days, except where required by law.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Children's Privacy</h2>
      <p>Saguaro is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting a notice in the app or sending an email. Continued use of Saguaro after changes are posted constitutes acceptance of the updated policy.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Contact Us</h2>
      <p>If you have questions or concerns about this Privacy Policy or your data, please contact us at:</p>
      <p style={{ background: "#f5f5f5", padding: "16px 20px", borderRadius: 8, fontWeight: 500 }}>
        📧 support@saguaroapp.com
      </p>

      <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid #e5e5e5" }} />
      <p style={{ color: "#999", fontSize: 14 }}>© 2026 Grand48. All rights reserved.</p>
    </div>
  );
}
