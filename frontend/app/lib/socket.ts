import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  socket = null;
};

export default getSocket;