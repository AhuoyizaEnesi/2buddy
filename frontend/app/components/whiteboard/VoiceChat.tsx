"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface VoiceChatProps {
  roomCode: string;
  username: string;
  partnerConnected: boolean;
  partnerName: string;
  socket: any;
}

export default function VoiceChat({
  roomCode,
  username,
  partnerConnected,
  partnerName,
  socket,
}: VoiceChatProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isInitiatorRef = useRef(false);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setConnected(false);
    setPartnerReady(false);
    setIsActive(false);
    setIsMuted(false);
    setError(null);
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("webrtc_signal", {
          room_code: roomCode,
          type: "ice_candidate",
          candidate: e.candidate,
          from: username,
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
      setConnected(true);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setConnected(false);
      }
    };

    return pc;
  }, [roomCode, username, socket]);

  const startVoiceChat = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerConnectionRef.current = pc;

      setIsActive(true);

      socket.emit("webrtc_ready", {
        room_code: roomCode,
        username,
      });

      if (partnerReady) {
        isInitiatorRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc_signal", {
          room_code: roomCode,
          type: "offer",
          sdp: offer,
          from: username,
        });
      }
    } catch (err: any) {
      setError("Microphone access denied. Please allow microphone permissions.");
      setIsActive(false);
    }
  }, [roomCode, username, socket, partnerReady, createPeerConnection]);

  useEffect(() => {
    if (!socket) return;

    const handlePartnerReady = async (data: { username: string }) => {
      setPartnerReady(true);

      if (isActive && peerConnectionRef.current && !isInitiatorRef.current) {
        isInitiatorRef.current = true;
        const pc = peerConnectionRef.current;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc_signal", {
          room_code: roomCode,
          type: "offer",
          sdp: offer,
          from: username,
        });
      }
    };

    const handleSignal = async (data: any) => {
      if (data.from === username) return;

      let pc = peerConnectionRef.current;

      if (!pc && data.type === "offer") {
        if (!localStreamRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            setIsActive(true);
          } catch {
            return;
          }
        }
        pc = createPeerConnection();
        localStreamRef.current.getTracks().forEach((track) =>
          pc!.addTrack(track, localStreamRef.current!)
        );
        peerConnectionRef.current = pc;
      }

      if (!pc) return;

      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc_signal", {
          room_code: roomCode,
          type: "answer",
          sdp: answer,
          from: username,
        });
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "ice_candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {}
      }
    };

    socket.on("partner_webrtc_ready", handlePartnerReady);
    socket.on("webrtc_signal", handleSignal);

    return () => {
      socket.off("partner_webrtc_ready", handlePartnerReady);
      socket.off("webrtc_signal", handleSignal);
    };
  }, [socket, roomCode, username, isActive, createPeerConnection]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleToggle = () => {
    if (isActive) {
      cleanup();
    } else {
      startVoiceChat();
    }
  };

  const handleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div style={{ marginBottom: 0 }}>
      <audio ref={remoteAudioRef} style={{ display: "none" }} autoPlay />

      <div style={{
        fontSize: 11, fontWeight: 700, color: "#6b7280",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
      }}>
        Voice Chat
      </div>

      {error && (
        <div style={{
          fontSize: 11, color: "#ef4444", backgroundColor: "#fef2f2",
          border: "1px solid #fecaca", padding: "6px 8px", marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 10px", backgroundColor: "#f9fafb", border: "1px solid #f3f4f6",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6,
              backgroundColor: isActive && connected ? "#22c55e" : isActive ? "#f97316" : "#d1d5db",
              borderRadius: "50%",
            }} />
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              {isActive && connected ? "Connected" : isActive ? "Connecting..." : "Off"}
            </span>
          </div>
          {isActive && connected && (
            <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>
              Live
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleToggle}
            disabled={!partnerConnected}
            style={{
              flex: 1, padding: "8px 0",
              backgroundColor: isActive ? "#ef4444" : "#1e3a5f",
              color: "#fff", border: "none", fontSize: 12,
              fontWeight: 700, cursor: partnerConnected ? "pointer" : "not-allowed",
              opacity: partnerConnected ? 1 : 0.5, borderRadius: 0,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              {isActive ? (
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
              ) : (
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              )}
            </svg>
            {isActive ? "End call" : "Start voice"}
          </button>

          {isActive && (
            <button
              onClick={handleMute}
              style={{
                width: 36, padding: "8px 0",
                backgroundColor: isMuted ? "#fef2f2" : "#f3f4f6",
                color: isMuted ? "#ef4444" : "#6b7280",
                border: `1px solid ${isMuted ? "#fecaca" : "#e5e7eb"}`,
                fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title={isMuted ? "Unmute" : "Mute"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                {isMuted ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                )}
              </svg>
            </button>
          )}
        </div>

        {!partnerConnected && (
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
            Waiting for partner to join before starting voice chat.
          </p>
        )}
      </div>
    </div>
  );
}