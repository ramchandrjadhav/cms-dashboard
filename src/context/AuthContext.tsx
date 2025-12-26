import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  groups: string[];
  avatar?: string;
}

interface AuthTokens {
  access: string;
  refresh: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  login: (userData: User, authTokens: AuthTokens, rememberMe: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roleName: string) => boolean;
  hasGroup: (groupName: string) => boolean;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto-login with mock data
    const mockTokens = {
      access: "mock-access-token",
      refresh: "mock-refresh-token"
    };
    const mockUser = {
      id: 1,
      username: "admin",
      first_name: "Admin",
      last_name: "User",
      email: "admin@rozana.com",
      role: "admin",
      is_active: true,
      date_joined: new Date().toISOString(),
      groups: ["admin"],
    };
    
    setUser(mockUser);
    setTokens(mockTokens);
    localStorage.setItem("tokens", JSON.stringify(mockTokens));
    localStorage.setItem("user", JSON.stringify(mockUser));
    setIsLoading(false);
  }, []);

  const login = (
    userData: User,
    authTokens: AuthTokens,
    rememberMe: boolean
  ) => {
    setUser(userData);
    setTokens(authTokens);

    if (rememberMe) {
      localStorage.setItem("tokens", JSON.stringify(authTokens));
      localStorage.setItem("user", JSON.stringify(userData));
      // Clear session storage
      sessionStorage.removeItem("tokens");
      sessionStorage.removeItem("user");
    } else {
      sessionStorage.setItem("tokens", JSON.stringify(authTokens));
      sessionStorage.setItem("user", JSON.stringify(userData));
      // Clear local storage
      localStorage.removeItem("tokens");
      localStorage.removeItem("user");
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("tokens");
    localStorage.removeItem("user");
    sessionStorage.removeItem("tokens");
    sessionStorage.removeItem("user");
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.role === roleName;
  };

  const hasGroup = (groupName: string): boolean => {
    if (!user) return false;
    return user.groups.includes(groupName);
  };

  const refreshToken = async (): Promise<void> => {
    if (!tokens?.refresh) {
      logout();
      return;
    }

    try {
      // You can implement token refresh logic here
      // For now, we'll just return a promise
      // In a real implementation, you'd call your refresh API endpoint
      console.log("Token refresh logic would go here");
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        login,
        logout,
        isAuthenticated: !!user && !!tokens,
        hasRole,
        hasGroup,
        isLoading,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
