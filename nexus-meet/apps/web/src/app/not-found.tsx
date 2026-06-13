import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "var(--bg-base, #0f172a)",
      color: "var(--text-primary, #f8fafc)",
      fontFamily: "var(--font-sans, sans-serif)",
      padding: "24px",
      textAlign: "center"
    }}>
      <h1 style={{
        fontSize: "80px",
        fontWeight: 800,
        marginBottom: "16px",
        background: "linear-gradient(135deg, var(--accent, #6366f1) 0%, #4f46e5 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        404
      </h1>
      <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
        Page Not Found
      </h2>
      <p style={{ color: "var(--text-muted, #94a3b8)", marginBottom: "32px", maxWidth: "480px" }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        style={{
          background: "var(--accent, #6366f1)",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: 500,
          textDecoration: "none",
          transition: "opacity 0.2s"
        }}
      >
        Go to Home
      </Link>
    </div>
  );
}
