"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { getUser, isAuthenticated, clearAuth } from "@/app/lib/auth";
import Button from "@/app/components/ui/Button";

interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

const subjects = [
  {
    id: "mathematics",
    label: "Mathematics",
    description: "Algebra, calculus, geometry, and more",
    color: "bg-violet-50 border-violet-200 hover:border-violet-400",
    activeColor: "bg-violet-100 border-violet-500",
    dot: "bg-violet-500",
  },
  {
    id: "physics",
    label: "Physics",
    description: "Mechanics, electricity, waves, and more",
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
    activeColor: "bg-blue-100 border-blue-500",
    dot: "bg-blue-500",
  },
  {
    id: "computer science",
    label: "Computer Science",
    description: "Algorithms, data structures, and more",
    color: "bg-teal-50 border-teal-200 hover:border-teal-400",
    activeColor: "bg-teal-100 border-teal-500",
    dot: "bg-teal-500",
  },
  {
    id: "chemistry",
    label: "Chemistry",
    description: "Reactions, equations, periodic table, and more",
    color: "bg-amber-50 border-amber-200 hover:border-amber-400",
    activeColor: "bg-amber-100 border-amber-500",
    dot: "bg-amber-500",
  },
];

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setUser(getUser());
  }, [router]);

  const handleJoin = async () => {
    if (!selectedSubject) {
      setError("Please select a subject first");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await sessionsAPI.joinOrCreate(selectedSubject);
      const session = res.data;

      if (session.status === "waiting") {
        setWaiting(true);
        setLoading(false);
        pollForPartner(session.id);
      } else {
        router.push(`/board?session=${session.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to join session");
      setLoading(false);
    }
  };

  const pollForPartner = (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await sessionsAPI.getSession(sessionId);
        if (res.data.status === "active") {
          clearInterval(interval);
          router.push(`/board?session=${sessionId}`);
        }
      } catch {
        clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      setWaiting(false);
      setError("No partner found. Try again in a moment.");
    }, 120000);
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">2buddy</h1>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back, {user?.username}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/history")}
            >
              History
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>

        {waiting ? (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
              <svg
                className="animate-spin w-8 h-8 text-violet-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Looking for a partner
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Waiting for someone studying{" "}
                <span className="font-medium text-violet-600">
                  {selectedSubject}
                </span>
                ...
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWaiting(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">
                Start a session
              </h2>
              <p className="text-sm text-gray-500">
                Pick a subject and get matched with a study partner in real
                time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`border-2 rounded-xl p-4 text-left transition-all ${
                    selectedSubject === subject.id
                      ? subject.activeColor
                      : subject.color
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${subject.dot}`} />
                    <span className="text-sm font-medium text-gray-900">
                      {subject.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {subject.description}
                  </p>
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button
              size="lg"
              loading={loading}
              onClick={handleJoin}
              disabled={!selectedSubject}
              className="w-full"
            >
              Find a partner
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}