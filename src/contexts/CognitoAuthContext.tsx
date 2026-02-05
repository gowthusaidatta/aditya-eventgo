import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

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
  login: () => void;
  logout: () => void;
  refreshTokens: () => Promise<void>;
}

const CognitoAuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  idToken: null,
  accessToken: null,
  login: () => {},
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

  const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN;
  const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI;

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
    setUser(null);
    setIdToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
  }, []);

  const login = useCallback(() => {
    const loginUrl = `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    window.location.href = loginUrl;
  }, [COGNITO_DOMAIN, CLIENT_ID, REDIRECT_URI]);

  const logout = useCallback(() => {
    clearAuthState();
    const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(import.meta.env.VITE_COGNITO_LOGOUT_URI)}`;
    window.location.href = logoutUrl;
  }, [COGNITO_DOMAIN, CLIENT_ID, clearAuthState]);

  const exchangeCodeForTokens = useCallback(
    async (code: string) => {
      try {
        const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: CLIENT_ID,
            code: code,
            redirect_uri: REDIRECT_URI,
          }).toString(),
        });

        if (!response.ok) {
          throw new Error("Failed to exchange code for tokens");
        }

        const data = await response.json();
        const { id_token, access_token, refresh_token } = data;

        // Store tokens
        localStorage.setItem("cognito_id_token", id_token);
        localStorage.setItem("cognito_access_token", access_token);
        if (refresh_token) {
          localStorage.setItem("cognito_refresh_token", refresh_token);
        }

        // Decode and set user from ID token
        const decoded = decodeJWT(id_token);
        if (decoded) {
          localStorage.setItem("cognito_user", JSON.stringify(decoded));
          setUser(decoded);
        }

        setIdToken(id_token);
        setAccessToken(access_token);
        setRefreshToken(refresh_token);
        setIsAuthenticated(true);

        return true;
      } catch (error) {
        console.error("Error exchanging code for tokens:", error);
        clearAuthState();
        return false;
      }
    },
    [COGNITO_DOMAIN, CLIENT_ID, REDIRECT_URI, clearAuthState]
  );

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) {
      clearAuthState();
      return;
    }

    try {
      const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: CLIENT_ID,
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        clearAuthState();
        return;
      }

      const data = await response.json();
      const { id_token, access_token } = data;

      localStorage.setItem("cognito_id_token", id_token);
      localStorage.setItem("cognito_access_token", access_token);

      setIdToken(id_token);
      setAccessToken(access_token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error refreshing tokens:", error);
      clearAuthState();
    }
  }, [refreshToken, COGNITO_DOMAIN, CLIENT_ID, clearAuthState]);

  // Store exchangeCodeForTokens for use in callback component
  useEffect(() => {
    (window as any).__exchangeCodeForTokens = exchangeCodeForTokens;
  }, [exchangeCodeForTokens]);

  return (
    <CognitoAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        idToken,
        accessToken,
        login,
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
