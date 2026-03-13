export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const getUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token: string, user: User) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};