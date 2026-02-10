import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiClient } from "@/integrations/api/apiClient";

interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

interface AuthContextType {
  user: CognitoUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  idToken: string | null;
  accessToken: string | null;
  loginWithPassword: (data: { username: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  signupWithPassword: (data: { email: string; password: string; name?: string; phone?: string }) => Promise<{ success: boolean; message?: string; userConfirmed?: boolean }>;
  confirmSignup: (data: { username: string; code: string }) => Promise<{ success: boolean; message?: string }>;
  resendConfirmation: (data: { username: string }) => Promise<{ success: boolean; message?: string }>;
  startPasswordReset: (data: { username: string }) => Promise<{ success: boolean; message?: string }>;
  confirmPasswordReset: (data: { username: string; code: string; newPassword: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
}

const CognitoAuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  idToken: null,
  accessToken: null,
  loginWithPassword: async () => ({ success: false }),
  signupWithPassword: async () => ({ success: false }),
  confirmSignup: async () => ({ success: false }),
  resendConfirmation: async () => ({ success: false }),
  startPasswordReset: async () => ({ success: false }),
  confirmPasswordReset: async () => ({ success: false }),
  logout: () => {},
  refreshTokens: async () => {},
});

export function CognitoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedIdToken = localStorage.getItem("cognito_id_token");
    const storedAccessToken = localStorage.getItem("cognito_access_token");
    const storedRefreshToken = localStorage.getItem("cognito_refresh_token");
    const storedUser = localStorage.getItem("cognito_user");

    if (storedIdToken && storedAccessToken && storedUser) {
      try {
        setIdToken(storedIdToken);
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to restore auth state:", error);
        clearAuthState();
      }
    }
    setLoading(false);
  }, []);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem("cognito_id_token");
    localStorage.removeItem("cognito_access_token");
    localStorage.removeItem("cognito_refresh_token");
    localStorage.removeItem("cognito_user");
    localStorage.removeItem("cognito_username");
    setUser(null);
    setIdToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
  }, []);

  const persistTokens = useCallback((tokens: { idToken: string; accessToken: string; refreshToken?: string }) => {
    localStorage.setItem("cognito_id_token", tokens.idToken);
    localStorage.setItem("cognito_access_token", tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem("cognito_refresh_token", tokens.refreshToken);
    }

    const decoded = decodeJWT(tokens.idToken);
    if (decoded) {
      localStorage.setItem("cognito_user", JSON.stringify(decoded));
      setUser(decoded);
    }

    setIdToken(tokens.idToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken || null);
    setIsAuthenticated(true);
  }, []);

  const loginWithPassword = useCallback(
    async (data: { username: string; password: string }) => {
      try {
        const response = await apiClient.authLogin(data);
        if (!response?.idToken || !response?.accessToken) {
          return { success: false, message: "Login failed" };
        }

        localStorage.setItem("cognito_username", data.username);

        persistTokens({
          idToken: response.idToken,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
        return { success: true };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, "Invalid credentials") };
      }
    },
    [persistTokens]
  );

  const signupWithPassword = useCallback(
    async (data: { email: string; password: string; name?: string; phone?: string }) => {
      try {
        const response = await apiClient.authSignup(data);
        return { success: true, userConfirmed: response?.userConfirmed };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, "Sign up failed") };
      }
    },
    []
  );

  const confirmSignup = useCallback(async (data: { username: string; code: string }) => {
    try {
      await apiClient.confirmSignup(data);
      return { success: true };
    } catch (error) {
      return { success: false, message: getApiErrorMessage(error, "Invalid confirmation code") };
    }
  }, []);

  const resendConfirmation = useCallback(async (data: { username: string }) => {
    try {
      await apiClient.resendConfirmation(data);
      return { success: true };
    } catch (error) {
      return { success: false, message: getApiErrorMessage(error, "Failed to resend code") };
    }
  }, []);

  const startPasswordReset = useCallback(async (data: { username: string }) => {
    try {
      await apiClient.forgotPassword(data);
      return { success: true };
    } catch (error) {
      return { success: false, message: getApiErrorMessage(error, "Failed to start reset") };
    }
  }, []);

  const confirmPasswordReset = useCallback(
    async (data: { username: string; code: string; newPassword: string }) => {
      try {
        await apiClient.confirmForgotPassword(data);
        return { success: true };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, "Failed to reset password") };
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) {
      clearAuthState();
      return;
    }

    try {
      const storedUser = localStorage.getItem("cognito_user");
      const storedUsername = localStorage.getItem("cognito_username");
      const username = storedUsername || (storedUser ? JSON.parse(storedUser)?.email : undefined);
      const response = await apiClient.authRefresh({
        refreshToken,
        username,
      });

      if (!response?.idToken || !response?.accessToken) {
        clearAuthState();
        return;
      }

      persistTokens({
        idToken: response.idToken,
        accessToken: response.accessToken,
      });
    } catch (error) {
      console.error("Error refreshing tokens:", error);
      clearAuthState();
    }
  }, [refreshToken, clearAuthState, persistTokens]);

  return (
    <CognitoAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        idToken,
        accessToken,
        loginWithPassword,
        signupWithPassword,
        confirmSignup,
        resendConfirmation,
        startPasswordReset,
        confirmPasswordReset,
        logout,
        refreshTokens,
      }}
    >
      {children}
    </CognitoAuthContext.Provider>
  );
}

export function useCognitoAuth() {
  const context = useContext(CognitoAuthContext);
  if (!context) {
    throw new Error("useCognitoAuth must be used within CognitoAuthProvider");
  }
  return context;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  return fallback;
}

// JWT Decoder Helper
function decodeJWT(token: string): CognitoUser | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}
