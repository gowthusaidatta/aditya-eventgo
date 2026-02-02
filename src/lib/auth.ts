import { supabase } from "@/integrations/supabase/client";

export type UserType = "student" | "college" | "admin";
export type CollegeRole = "principal" | "dean" | "staff_coordinator" | "student_coordinator";

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  userType: UserType;
  phone?: string;
  // Student fields
  collegeName?: string;
  graduationYear?: number;
  rollNumber?: string;
  branch?: string;
  // College fields
  collegeRole?: CollegeRole;
  collegeId?: string;
}

export async function signUp(data: SignupData) {
  const { email, password, fullName, userType, phone, collegeName, graduationYear, collegeRole, rollNumber, branch, collegeId } = data;

  // Create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Failed to create user");

  // Create the profile
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: authData.user.id,
    full_name: fullName,
    email,
    phone,
    user_type: userType,
    college_name: collegeName,
    graduation_year: graduationYear,
    roll_number: rollNumber,
    branch,
    college_id: collegeId,
    is_verified: false, // All new users start unverified
  });

  if (profileError) throw profileError;

  // If college user, create the role entry
  if (userType === "college" && collegeRole) {
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      role: collegeRole,
    });

    if (roleError) throw roleError;
  }

  return authData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserRole(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data?.role as CollegeRole | undefined;
}
