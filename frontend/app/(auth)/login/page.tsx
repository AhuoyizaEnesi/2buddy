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
      minHeight: "100vh", backgroundColor: "#f0ebe0",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 420, backgroundColor: "#faf7f0",
        border: "1px solid #c4b898", padding: 40,
        boxShadow: "0 4px 24px rgba(60,40,10,0.10)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Caveat', cursive", fontSize: 36, fontWeight: 700,
            color: "#3d2f1a", marginBottom: 4,
          }}>
            2<span style={{ color: "#b85c2a" }}>Buddy</span>
          </div>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: "#7a6a52" }}>
            Sign in and pick up where you left off
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{
              display: "block", fontFamily: "'Caveat', cursive", fontSize: 14,
              color: "#7a6a52", marginBottom: 4, letterSpacing: "0.05em",
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
              display: "block", fontFamily: "'Caveat', cursive", fontSize: 14,
              color: "#7a6a52", marginBottom: 4, letterSpacing: "0.05em",
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
              border: "none", color: "#fdf8f0", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Caveat', cursive", fontSize: 18, fontWeight: 600,
              marginTop: 8, opacity: loading ? 0.7 : 1, borderRadius: 0,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{
          textAlign: "center", fontFamily: "'Crimson Pro', serif",
          fontSize: 14, color: "#7a6a52", marginTop: 24,
        }}>
          No account yet?{" "}
          <Link href="/register" style={{ color: "#b85c2a", fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}