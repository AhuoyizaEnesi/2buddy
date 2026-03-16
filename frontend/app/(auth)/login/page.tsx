"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authAPI } from "@/app/lib/api";
import { setAuth } from "@/app/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loginRes = await authAPI.login(form);
      const token = loginRes.data.access_token;
      localStorage.setItem("token", token);
      const meRes = await authAPI.getMe();
      setAuth(token, meRes.data);
      router.push("/lobby");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f0ebe0",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Navbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 56,
        backgroundColor: "#3d2f1a", borderBottom: "2px solid #c4b898",
      }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, fontWeight: 700, color: "#fdf8f0" }}>
          2<span style={{ color: "#b85c2a" }}>Buddy</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/register" style={{
            padding: "6px 18px", backgroundColor: "#b85c2a", color: "#fdf8f0",
            fontFamily: "'Caveat', cursive", fontSize: 15, fontWeight: 600,
            textDecoration: "none", borderRadius: 0,
          }}>
            Sign up free
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Left — Hero */}
        <div style={{
          flex: 1, padding: "60px 48px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          backgroundColor: "#3d2f1a",
        }}>
          <div style={{
            display: "inline-block",
            fontFamily: "'Caveat', cursive", fontSize: 13,
            backgroundColor: "#b85c2a", color: "#fdf8f0",
            padding: "3px 14px", marginBottom: 20, letterSpacing: "0.1em",
            transform: "rotate(-1deg)", width: "fit-content",
          }}>
            COLLABORATIVE LEARNING
          </div>

          <h1 style={{
            fontFamily: "'Caveat', cursive", fontSize: 56, fontWeight: 700,
            color: "#fdf8f0", lineHeight: 1.1, marginBottom: 8,
          }}>
            Study Together.
          </h1>
          <h1 style={{
            fontFamily: "'Caveat', cursive", fontSize: 56, fontWeight: 700,
            color: "#b85c2a", lineHeight: 1.1, marginBottom: 24,
          }}>
            Learn Faster.
          </h1>

          <p style={{
            fontFamily: "'Crimson Pro', serif", fontSize: 18,
            color: "#c4b898", lineHeight: 1.7, marginBottom: 40,
            maxWidth: 480,
          }}>
            2Buddy pairs you with a study partner in real time. Work through
            problems together on a shared whiteboard while an AI tutor watches
            your work and nudges you in the right direction.
          </p>

          {/* Live indicator */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            backgroundColor: "rgba(184,92,42,0.15)", border: "1px solid #b85c2a",
            padding: "10px 20px", width: "fit-content", marginBottom: 48,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", backgroundColor: "#b85c2a",
              boxShadow: "0 0 6px #b85c2a",
            }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: "#fdf8f0" }}>
              Real-time collaboration · AI-powered hints · Voice chat
            </span>
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "1", title: "Shared Whiteboard", desc: "Draw, write, and solve problems together in real time" },
              { icon: "2", title: "AI Tutor", desc: "Silently monitors your work and gives Socratic hints when needed" },
              { icon: "3", title: "Voice Chat", desc: "Talk to your partner directly — no third party app needed" },
              { icon: "4", title: "Curated Problems", desc: "Math, physics, CS, and chemistry problem sets ready to go" },
            ].map((f) => (
              <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700, color: "#fdf8f0", marginBottom: 2 }}>
                    {f.title}
                  </div>
                  <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: "#a89878", lineHeight: 1.5 }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Login Form */}
        <div style={{
          width: 420, flexShrink: 0,
          backgroundColor: "#faf7f0",
          borderLeft: "2px solid #c4b898",
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "48px 40px",
        }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: "'Caveat', cursive", fontSize: 32, fontWeight: 700,
              color: "#3d2f1a", marginBottom: 4,
            }}>
              Welcome back
            </div>
            <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: "#7a6a52" }}>
              Sign in and pick up where you left off
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{
                display: "block", fontFamily: "'Caveat', cursive", fontSize: 13,
                color: "#7a6a52", marginBottom: 4, letterSpacing: "0.08em",
              }}>
                USERNAME
              </label>
              <input
                name="username"
                type="text"
                placeholder="your_username"
                value={form.username}
                onChange={handleChange}
                required
                style={{
                  width: "100%", padding: "10px 12px",
                  border: "1.5px solid #c4b898", backgroundColor: "#faf7f0",
                  fontFamily: "'Crimson Pro', serif", fontSize: 15, color: "#3d2f1a",
                  outline: "none", borderRadius: 0,
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontFamily: "'Caveat', cursive", fontSize: 13,
                color: "#7a6a52", marginBottom: 4, letterSpacing: "0.08em",
              }}>
                PASSWORD
              </label>
              <input
                name="password"
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                required
                style={{
                  width: "100%", padding: "10px 12px",
                  border: "1.5px solid #c4b898", backgroundColor: "#faf7f0",
                  fontFamily: "'Crimson Pro', serif", fontSize: 15, color: "#3d2f1a",
                  outline: "none", borderRadius: 0,
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: "8px 12px", backgroundColor: "#fee2e2",
                border: "1px solid #fca5a5",
                fontFamily: "'Crimson Pro', serif", fontSize: 13, color: "#991b1b",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 0", backgroundColor: "#b85c2a",
                border: "none", color: "#fdf8f0",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Caveat', cursive", fontSize: 18, fontWeight: 600,
                marginTop: 8, opacity: loading ? 0.7 : 1, borderRadius: 0,
              }}
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          <div style={{ height: 1, borderBottom: "1px dashed #c4b898", margin: "24px 0" }} />

          <p style={{
            textAlign: "center", fontFamily: "'Crimson Pro', serif",
            fontSize: 14, color: "#7a6a52",
          }}>
            No account yet?{" "}
            <Link href="/register" style={{ color: "#b85c2a", fontWeight: 600 }}>
              Create one free
            </Link>
          </p>

          {/* Subjects */}
          <div style={{ marginTop: 32 }}>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 12, color: "#a89878", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Available subjects
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Mathematics", "Physics", "Computer Science", "Chemistry"].map((s) => (
                <span key={s} style={{
                  fontFamily: "'Caveat', cursive", fontSize: 13,
                  backgroundColor: "#e8e0cc", color: "#5c4d37",
                  padding: "3px 10px", border: "1px solid #c4b898",
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}