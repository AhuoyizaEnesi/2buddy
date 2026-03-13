"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authAPI } from "@/app/lib/api";
import { setAuth } from "@/app/lib/auth";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";

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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">2buddy</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Sign in and pick up where you left off
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Username"
            name="username"
            type="text"
            placeholder="your_username"
            value={form.username}
            onChange={handleChange}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-2">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          No account yet?{" "}
          <Link href="/register" className="text-violet-600 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}