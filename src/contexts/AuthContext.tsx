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
  refreshProfile: (activeUser?: AuthUser | null) => Promise<void>;
}

const pendingProfileKey = "pending_profile";

type PendingProfile = {
  email: string;
  full_name?: string;
  phone?: string | null;
  user_type: UserType;
  college_name?: string | null;
  graduation_year?: number | null;
  roll_number?: string | null;
  branch?: string | null;
  college_id?: string | null;
  college_role?: CollegeRole | null;
  is_verified?: boolean;
};

function readPendingProfile(email?: string): PendingProfile | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(pendingProfileKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingProfile;
    if (email && parsed?.email && parsed.email !== email) {
      return null;
    }
    return parsed;
  } catch (error) {
    localStorage.removeItem(pendingProfileKey);
    return null;
  }
}

function clearPendingProfile(email?: string) {
  if (typeof localStorage === "undefined") return;
  if (!email) {
    localStorage.removeItem(pendingProfileKey);
    return;
  }
  const pending = readPendingProfile(email);
  if (pending?.email === email) {
    localStorage.removeItem(pendingProfileKey);
  }
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

  const refreshProfile = async (activeUser?: AuthUser | null) => {
    const resolvedUser = activeUser ?? user;
    if (!resolvedUser) return;
    
    try {
      let profileData = await apiClient.getProfile();
      const pendingProfile = readPendingProfile(resolvedUser.email);

      if (!profileData?.user_type) {
        const userType = pendingProfile?.user_type || "student";
        profileData = await apiClient.updateProfile({
          user_type: userType,
          full_name: pendingProfile?.full_name || resolvedUser.name || resolvedUser.email,
          email: pendingProfile?.email || resolvedUser.email,
          phone: pendingProfile?.phone ?? null,
          college_name: pendingProfile?.college_name ?? null,
          graduation_year: pendingProfile?.graduation_year ?? null,
          roll_number: pendingProfile?.roll_number ?? null,
          branch: pendingProfile?.branch ?? null,
          college_id: pendingProfile?.college_id ?? null,
          college_role: pendingProfile?.college_role ?? null,
          is_verified:
            pendingProfile?.is_verified ?? (userType === "college" ? false : true),
        });
        clearPendingProfile(resolvedUser.email);
      } else if (pendingProfile?.email === resolvedUser.email) {
        clearPendingProfile(resolvedUser.email);
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
      const nextUser = {
        id: cognitoUser.sub,
        email: cognitoUser.email,
        name: cognitoUser.name,
      };
      setUser(nextUser);
      refreshProfile(nextUser).finally(() => setLoading(false));
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
