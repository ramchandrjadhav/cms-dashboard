import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserInfo {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "master" | "manager" | string;
  is_active: boolean;
  avatar?: string;
}

interface LoginContextType {
  user: UserInfo | null;
  login: (user: UserInfo) => void;
  logout: () => void;
}

const LoginContext = createContext<LoginContextType | undefined>(undefined);

export const useLogin = () => {
  const ctx = useContext(LoginContext);
  if (!ctx) throw new Error("useLogin must be used within a LoginProvider");
  return ctx;
};

export const LoginProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = (userInfo: UserInfo) => {
    setUser(userInfo);
    localStorage.setItem("user", JSON.stringify(userInfo));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  if (loading) return null; // or a spinner if you prefer

  return (
    <LoginContext.Provider value={{ user, login, logout }}>
      {children}
    </LoginContext.Provider>
  );
};
