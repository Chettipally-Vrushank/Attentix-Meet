"use client";
import { useState }     from "react";
import { useRouter }    from "next/navigation";
import { useMeetingStore } from "@/lib/store";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";

export default function RegisterPage() {
  const router   = useRouter();
  const setAuth  = useMeetingStore(s => s.setAuth);
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !pass.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${SIGNAL_URL}/api/auth/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      
      setAuth(data.token, data.user.id, data.user.name);
      router.push("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:      "100vh",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      background:     "var(--bg-base)",
      fontFamily:     "var(--font-sans)",
      position:       "relative",
      padding:        "20px",
      overflow:       "hidden"
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
        opacity: 0.3, pointerEvents: "none", zIndex: 0
      }}/>

      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        style={{
          position: "absolute", top: 24, left: 24,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "8px 14px", cursor: "pointer",
          color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: 500, zIndex: 10
        }}
      >
        <ArrowLeft size={14}/> Back to site
      </button>

      <div style={{
        width:        400,
        background:   "var(--bg-surface)",
        border:       "1px solid var(--border)",
        borderRadius: 20,
        padding:      40,
        boxShadow:    "0 20px 40px rgba(0,0,0,0.5)",
        position:     "relative",
        zIndex:       1
      }}>
        {/* Logo and Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent), #a855f7)", 
            marginBottom: 20, marginInline: "auto",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px var(--accent-glow)"
          }}>
            <span style={{ fontSize: 22, fontWeight: "bold", color: "#fff" }}>⬡</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.5px" }}>Create your account</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Get started with your free trial today
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--danger-soft)", border: "1px solid var(--danger)",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, color: "var(--danger)", marginBottom: 16,
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Form Fields */}
        {[
          { label: "Full Name", value: name, set: setName, type: "text", placeholder: "Alice Host" },
          { label: "Email Address", value: email, set: setEmail, type: "email", placeholder: "you@example.com" },
          { label: "Password", value: pass, set: setPass, type: "password", placeholder: "••••••••" },
        ].map(({ label, value, set, type, placeholder }) => (
          <div key={label} style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 6, fontWeight: 500 }}>
              {label}
            </label>
            <input
              type={type} value={value} placeholder={placeholder}
              onChange={e => set(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
              style={{
                width: "100%", padding: "11px 14px",
                background: "var(--bg-raised)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text-primary)",
                fontSize: 14, outline: "none",
                fontFamily: "var(--font-sans)",
                transition: "border-color 0.15s"
              }}
            />
          </div>
        ))}

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            width: "100%", padding: "12px",
            background: loading ? "var(--accent-soft)" : "var(--accent)",
            border: "none", borderRadius: 8,
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: 10, transition: "background 0.15s",
            boxShadow: loading ? "none" : "0 4px 12px var(--accent-glow)"
          }}
        >
          {loading ? "Creating account..." : "Sign Up →"}
        </button>

        {/* Login Link */}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>Already have an account? </span>
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
