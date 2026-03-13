import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post("/auth/register", data),

  login: (data: { username: string; password: string }) =>
    api.post("/auth/login", data),

  getMe: () => api.get("/auth/me"),
};

export const sessionsAPI = {
  joinOrCreate: (subject: string) =>
    api.post("/sessions/join", { subject }),

  getSession: (sessionId: string) =>
    api.get(`/sessions/${sessionId}`),

  endSession: (sessionId: string) =>
    api.post(`/sessions/${sessionId}/end`),

  getHistory: () => api.get("/sessions/history"),
};

export const problemsAPI = {
  getBySubject: (subject: string) =>
    api.get(`/problems/${subject}`),

  getById: (problemId: string) =>
    api.get(`/problems/single/${problemId}`),
};

export default api;