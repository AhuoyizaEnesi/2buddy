"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { getUser, isAuthenticated } from "@/app/lib/auth";
import { connectSocket, disconnectSocket } from "@/app/lib/socket";
import Canvas, { CanvasRef } from "@/app/components/whiteboard/Canvas";
import Toolbar, { Tool } from "@/app/components/whiteboard/Toolbar";
import AIPanel from "@/app/components/whiteboard/AIPanel";
import ProblemPanel from "@/app/components/whiteboard/ProblemPanel";
import Button from "@/app/components/ui/Button";

interface AIMessage {
  type: "auto_check" | "review" | "stuck" | "error" | "thinking";
  message: string;
  check_number?: number;
  timestamp: Date;
}

interface PartnerCursorData {
  x: number;
  y: number;
  color: string;
  username: string;
}

interface Problem {
  id: string;
  subject: string;
  title: string;
  description: string;
  difficulty: string;
}

interface Session {
  id: string;
  room_code: string;
  subject: string;
  status: string;
  problem: Problem | null;
}

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const canvasRef = useRef<CanvasRef>(null);
  const user = getUser();

  const [session, setSession] = useState<Session | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [activeColor, setActiveColor] = useState("#1a1a1a");
  const [strokeSize, setStrokeSize] = useState(4);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [stuckVotes, setStuckVotes] = useState(0);
  const [hasVotedStuck, setHasVotedStuck] = useState(false);
  const [checksRemaining, setChecksRemaining] = useState(4);
  const [partnerCursor, setPartnerCursor] = useState<PartnerCursorData | null>(null);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerColor, setPartnerColor] = useState("#1D9E75");
  const [userColor] = useState("#7F77DD");
  const [sessionTimer, setSessionTimer] = useState(1200);
  const [notification, setNotification] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (!sessionId) {
      router.push("/lobby");
      return;
    }

    sessionsAPI.getSession(sessionId).then((res) => {
      setSession(res.data);
    });
  }, [sessionId, router]);

  useEffect(() => {
    if (!session || !user) return;

    const socket = connectSocket();

    socket.on("connect", () => {
      socket.emit("join_room", {
        room_code: session.room_code,
        username: user.username,
        color: userColor,
        problem_description: session.problem?.description || "No problem loaded",
      });
    });

    socket.on("room_joined", ({ canvas_data }: { canvas_data: string }) => {
      if (canvas_data && canvasRef.current) {
        canvasRef.current.loadFromDataUrl(canvas_data);
      }
    });

    socket.on("partner_joined", ({ username, color }: { username: string; color: string }) => {
      setPartnerConnected(true);
      setPartnerName(username);
      setPartnerColor(color);
      showNotification(`${username} joined the board`);
    });

    socket.on("partner_disconnected", ({ username }: { username: string }) => {
      setPartnerConnected(false);
      showNotification(`${username} disconnected`);
    });

    socket.on("receive_stroke", (data: any) => {
      if (canvasRef.current) {
        canvasRef.current.applyRemoteStroke(data.stroke);
      }
    });

    socket.on("partner_cursor", (data: any) => {
      setPartnerCursor({
        x: data.x,
        y: data.y,
        color: data.color,
        username: data.username,
      });
    });

    socket.on("canvas_cleared", () => {
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
      showNotification("Canvas cleared");
    });

    socket.on("ai_thinking", ({ type }: { type: string }) => {
      setAiMessages((prev) => [
        ...prev,
        {
          type: "thinking",
          message: type === "stuck" ? "Thinking of a hint..." : "Reviewing your work...",
          timestamp: new Date(),
        },
      ]);
    });

    socket.on("ai_feedback", (data: any) => {
      setAiMessages((prev) => {
        const filtered = prev.filter((m) => m.type !== "thinking");
        if (data.type === "auto_check" && data.message === "NO_ERROR") {
          return filtered;
        }
        if (data.type === "auto_check") {
          setChecksRemaining((c) => Math.max(0, c - 1));
          showNotification("AI tutor has a note for you");
        }
        return [
          ...filtered,
          {
            type: data.type,
            message: data.message,
            check_number: data.check_number,
            timestamp: new Date(),
          },
        ];
      });
    });

    socket.on("stuck_vote_update", ({ votes }: { votes: number }) => {
      setStuckVotes(votes);
    });

    return () => {
      socket.off("connect");
      socket.off("room_joined");
      socket.off("partner_joined");
      socket.off("partner_disconnected");
      socket.off("receive_stroke");
      socket.off("partner_cursor");
      socket.off("canvas_cleared");
      socket.off("ai_thinking");
      socket.off("ai_feedback");
      socket.off("stuck_vote_update");
      disconnectSocket();
    };
  }, [session, user, userColor]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimer((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStroke = useCallback(
    (stroke: any) => {
      if (!session) return;
      const socket = connectSocket();
      socket.emit("draw_stroke", {
        room_code: session.room_code,
        stroke,
      });
    },
    [session]
  );

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      if (!session || !user) return;
      const socket = connectSocket();
      socket.emit("cursor_move", {
        room_code: session.room_code,
        x,
        y,
        color: userColor,
        username: user.username,
      });
    },
    [session, user, userColor]
  );

  const handleCanvasUpdate = useCallback(
    (dataUrl: string) => {
      if (!session) return;
      const socket = connectSocket();
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      socket.emit("canvas_update", {
        room_code: session.room_code,
        canvas_data: base64,
      });
    },
    [session]
  );

  const handleClear = useCallback(() => {
    if (!session) return;
    canvasRef.current?.clearCanvas();
    const socket = connectSocket();
    socket.emit("clear_canvas", { room_code: session.room_code });
  }, [session]);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleRequestReview = useCallback(() => {
    if (!session) return;
    const socket = connectSocket();
    const dataUrl = canvasRef.current?.getDataUrl() || "";
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    socket.emit("request_review", {
      room_code: session.room_code,
      canvas_data: base64,
      problem_description: session.problem?.description || "",
    });
  }, [session]);

  const handleVoteStuck = useCallback(() => {
    if (!session || hasVotedStuck) return;
    setHasVotedStuck(true);
    const socket = connectSocket();
    const dataUrl = canvasRef.current?.getDataUrl() || "";
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    socket.emit("vote_stuck", {
      room_code: session.room_code,
      username: user?.username,
      canvas_data: base64,
      problem_description: session.problem?.description || "",
    });
  }, [session, hasVotedStuck, user]);

  const handleEndSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      await sessionsAPI.endSession(session.id);
      disconnectSocket();
      router.push("/lobby");
    } catch {
      setEnding(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin w-8 h-8 text-violet-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-gray-900">2buddy</span>
          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
            {session.room_code}
          </span>
          <span className="text-xs text-gray-500 capitalize">
            {session.subject}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {notification && (
            <span className="text-xs bg-violet-50 text-violet-700 px-3 py-1 rounded-full border border-violet-200">
              {notification}
            </span>
          )}
          <Button
            variant="danger"
            size="sm"
            loading={ending}
            onClick={handleEndSession}
          >
            End session
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ProblemPanel
          problem={session.problem}
          sessionTimer={sessionTimer}
          partnerConnected={partnerConnected}
          partnerName={partnerName}
          partnerColor={partnerColor}
          userName={user?.username || ""}
          userColor={userColor}
        />

        <div className="flex flex-1 overflow-hidden relative">
          <div className="flex items-center justify-center p-3 bg-gray-100">
            <Toolbar
              activeTool={activeTool}
              activeColor={activeColor}
              strokeSize={strokeSize}
              onToolChange={setActiveTool}
              onColorChange={setActiveColor}
              onStrokeSizeChange={setStrokeSize}
              onClear={handleClear}
              onUndo={handleUndo}
            />
          </div>

          <div className="flex-1 p-3 overflow-hidden">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-gray-200"
              style={{
                backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            >
              <Canvas
                ref={canvasRef}
                activeTool={activeTool}
                activeColor={activeColor}
                strokeSize={strokeSize}
                partnerCursor={partnerCursor}
                onStroke={handleStroke}
                onCursorMove={handleCursorMove}
                onCanvasUpdate={handleCanvasUpdate}
              />
            </div>
          </div>
        </div>

        <AIPanel
          messages={aiMessages}
          stuckVotes={stuckVotes}
          onRequestReview={handleRequestReview}
          onVoteStuck={handleVoteStuck}
          hasVotedStuck={hasVotedStuck}
          checksRemaining={checksRemaining}
        />
      </div>
    </div>
  );
}