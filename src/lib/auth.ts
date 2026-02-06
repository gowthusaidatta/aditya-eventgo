export type UserType = "student" | "college" | "admin";
export type CollegeRole = "principal" | "dean" | "staff_coordinator" | "student_coordinator" | "host";

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
