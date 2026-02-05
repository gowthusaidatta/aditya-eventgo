import { useEffect, useState } from "react";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";

export function useRequireAuth() {
  const { isAuthenticated, loading } = useCognitoAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);

  return { isAuthenticated, loading, isReady };
}

export function useAuthUser() {
  const { user, isAuthenticated } = useCognitoAuth();
  return { user, isAuthenticated };
}
