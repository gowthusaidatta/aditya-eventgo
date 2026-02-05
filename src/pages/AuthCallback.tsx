import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useCognitoAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`);
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      if (!code) {
        setError("No authorization code received from Cognito");
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        // Exchange code for tokens
        const exchangeCodeForTokens = (window as any).__exchangeCodeForTokens;
        if (!exchangeCodeForTokens) {
          throw new Error("Auth context not initialized");
        }

        const success = await exchangeCodeForTokens(code);
        if (success) {
          // Redirect to dashboard after successful login
          setTimeout(() => navigate("/dashboard"), 500);
        } else {
          setError("Failed to exchange code for tokens");
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (err) {
        console.error("Callback error:", err);
        setError(
          err instanceof Error ? err.message : "Authentication failed"
        );
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <div className="text-red-600">
            <h2 className="text-2xl font-bold mb-4">Authentication Error</h2>
            <p className="mb-4">{error}</p>
            <p className="text-sm text-gray-600">
              Redirecting to login page...
            </p>
          </div>
        ) : (
          <div className="text-blue-600">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold">Signing you in...</h2>
            <p className="text-sm text-gray-600 mt-2">
              Please wait while we complete your authentication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
