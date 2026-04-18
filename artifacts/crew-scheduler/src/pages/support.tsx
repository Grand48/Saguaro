export default function Support() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.7 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, background: "#1a9e4a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 20 }}>🌵</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1a9e4a" }}>Saguaro</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>Support</h1>
        <p style={{ color: "#666", margin: 0 }}>We're here to help.</p>
      </div>

      <div style={{ background: "#f0faf4", border: "1px solid #c3e6cb", borderRadius: 12, padding: "24px 28px", marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1a9e4a" }}>Contact Support</h2>
        <p style={{ margin: 0 }}>Email us at <a href="mailto:support@saguaroapp.com" style={{ color: "#1a9e4a", fontWeight: 600 }}>support@saguaroapp.com</a> and we'll get back to you within 24 hours.</p>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Frequently Asked Questions</h2>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24 }}>How do I add crew members?</h3>
      <p>Go to the Crew section from the bottom navigation bar, then tap the "+" button to invite a new crew member by email.</p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24 }}>How does the time clock work?</h3>
      <p>Crew members can check in and out from the Time Clock tab. Check-ins are recorded with a timestamp and optional GPS location.</p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24 }}>How do I cancel my subscription?</h3>
      <p>You can cancel your subscription at any time through your iPhone's Settings app: Settings → Apple ID → Subscriptions → Saguaro → Cancel Subscription. Your access will continue until the end of the current billing period.</p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24 }}>How do I restore my subscription on a new device?</h3>
      <p>Open the Saguaro app, go to the subscription screen, and tap "Restore Purchases." Your subscription will be restored automatically using your Apple ID.</p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24 }}>Can I use Saguaro on multiple devices?</h3>
      <p>Yes — your account and data sync across all devices you sign in to with the same credentials.</p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24 }}>Is my data backed up?</h3>
      <p>Yes. All your data is securely stored on our servers and accessible from any device.</p>

      <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid #e5e5e5" }} />
      <p style={{ color: "#999", fontSize: 14 }}>© 2026 Saguaro. All rights reserved. · <a href="/privacy" style={{ color: "#999" }}>Privacy Policy</a></p>
    </div>
  );
}
