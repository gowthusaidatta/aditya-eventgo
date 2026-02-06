import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiClient } from "@/integrations/api/apiClient";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import { UserType, CollegeRole } from "@/lib/auth";

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  user_type: UserType;
  college_name: string | null;
  graduation_year: number | null;
  roll_number: string | null;
  branch: string | null;
  college_id: string | null;
  is_verified: boolean;
  college_role?: CollegeRole | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  collegeRole: CollegeRole | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  collegeRole: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: cognitoUser, isAuthenticated, loading: cognitoLoading } = useCognitoAuth();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collegeRole, setCollegeRole] = useState<CollegeRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      let profileData = await apiClient.getProfile();

      if (!profileData?.user_type) {
        profileData = await apiClient.updateProfile({
          user_type: "student",
          full_name: user.name || user.email,
          email: user.email,
          is_verified: true,
        });
      }

      setProfile(profileData as Profile);

      if (profileData?.user_type === "college") {
        setCollegeRole(profileData.college_role || null);
      } else {
        setCollegeRole(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    if (cognitoLoading) return;

    if (isAuthenticated && cognitoUser) {
      setUser({
        id: cognitoUser.sub,
        email: cognitoUser.email,
        name: cognitoUser.name,
      });
      refreshProfile().finally(() => setLoading(false));
    } else {
      setUser(null);
      setProfile(null);
      setCollegeRole(null);
      setLoading(false);
    }
  }, [cognitoLoading, isAuthenticated, cognitoUser]);

  return (
    <AuthContext.Provider value={{ user, profile, collegeRole, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
