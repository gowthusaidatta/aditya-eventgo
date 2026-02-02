import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile, getUserRole, UserType, CollegeRole } from "@/lib/auth";

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
  organization_name: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collegeRole, setCollegeRole] = useState<CollegeRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const profileData = await getUserProfile(user.id);
      setProfile(profileData as Profile);
      
      if (profileData.user_type === "college") {
        const role = await getUserRole(user.id);
        setCollegeRole(role || null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer profile fetch to avoid blocking auth state change
          setTimeout(async () => {
            try {
              const profileData = await getUserProfile(session.user.id);
              setProfile(profileData as Profile);

              if (profileData.user_type === "college") {
                const role = await getUserRole(session.user.id);
                setCollegeRole(role || null);
              }
            } catch (error) {
              console.error("Error fetching profile:", error);
            }
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setCollegeRole(null);
          setLoading(false);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, collegeRole, loading, refreshProfile }}>
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
