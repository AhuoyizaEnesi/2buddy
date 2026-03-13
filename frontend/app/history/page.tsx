"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { isAuthenticated } from "@/app/lib/auth";
import Button from "@/app/components/ui/Button";

interface Session {
  id: string;
  room_code: string;
  subject: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  problem: {
    title: string;
    description: string;
    difficulty: string;
  } | null;
  hints: {
    id: string;
    trigger_type: string;
    hint_text: string;
    created_at: string;
  }[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    sessionsAPI.getHistory().then((res) => {
      setSessions(res.data);
      setLoading(false);
    });
  }, [router]);

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-700";
      case "medium": return "bg-amber-100 text-amber-700";
      case "hard": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session history</h1>
            <p className="text-sm text-gray-500 mt-1">Your past study sessions</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/lobby")}>
            Back to lobby
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin w-6 h-6 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-500 text-sm">No completed sessions yet.</p>
            <Button className="mt-4" size="sm" onClick={() => router.push("/lobby")}>
              Start your first session
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-2xl shadow border border-gray-100">
                <button
                  className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
                  onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {session.subject}
                      </span>
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {session.room_code}
                      </span>
                      {session.problem && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyStyle(session.problem.difficulty)}`}>
                          {session.problem.difficulty}
                        </span>
                      )}
                    </div>
                    {session.problem && (
                      <p className="text-sm text-gray-600">{session.problem.title}</p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(session.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{session.hints.length} hints</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                      className={`w-4 h-4 text-gray-400 transition-transform ${expanded === session.id ? "rotate-180" : ""}`}>
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </div>
                </button>

                {expanded === session.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 flex flex-col gap-3">
                    {session.problem && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
                        {session.problem.description}
                      </div>
                    )}
                    {session.hints.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          AI hints received
                        </p>
                        {session.hints.map((hint) => (
                          <div key={hint.id} className="text-sm text-gray-700 bg-violet-50 border-l-4 border-violet-300 rounded-r-xl px-3 py-2 leading-relaxed">
                            <p className="text-xs text-violet-500 font-medium mb-1 capitalize">
                              {hint.trigger_type.replace("_", " ")}
                            </p>
                            {hint.hint_text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}