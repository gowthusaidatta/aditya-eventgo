import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { signUp, CollegeRole } from "@/lib/auth";
import { Eye, EyeOff, GraduationCap, Building2, Briefcase } from "lucide-react";
import eventgoLogo from "@/assets/eventgo-logo.png";

type SignupUserType = "student" | "college" | "company";

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  userType: z.enum(["student", "college", "company"]),
  // Student fields
  collegeName: z.string().optional(),
  graduationYear: z.string().optional(),
  // College fields
  collegeRole: z.enum(["principal", "dean", "staff_coordinator", "student_coordinator"]).optional(),
  // Company fields
  organizationName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.userType === "student") {
    return data.collegeName && data.collegeName.length >= 2;
  }
  return true;
}, {
  message: "College name is required",
  path: ["collegeName"],
}).refine((data) => {
  if (data.userType === "college") {
    return data.collegeRole;
  }
  return true;
}, {
  message: "Please select your role",
  path: ["collegeRole"],
}).refine((data) => {
  if (data.userType === "company") {
    return data.organizationName && data.organizationName.length >= 2;
  }
  return true;
}, {
  message: "Organization name is required",
  path: ["organizationName"],
});

type SignupFormData = z.infer<typeof signupSchema>;

const userTypeInfo: Record<SignupUserType, { icon: typeof GraduationCap; title: string; description: string }> = {
  student: {
    icon: GraduationCap,
    title: "Student",
    description: "Browse events and find opportunities",
  },
  college: {
    icon: Building2,
    title: "College Staff",
    description: "Manage college events and registrations",
  },
  company: {
    icon: Briefcase,
    title: "Company",
    description: "Post jobs and recruit talent",
  },
};

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as SignupUserType) || "student";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      userType: initialType,
      collegeName: "",
      graduationYear: "",
      collegeRole: undefined,
      organizationName: "",
    },
  });

  const userType = form.watch("userType");

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    try {
      await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        userType: data.userType as SignupUserType,
        phone: data.phone || undefined,
        collegeName: data.collegeName || undefined,
        graduationYear: data.graduationYear ? parseInt(data.graduationYear) : undefined,
        collegeRole: data.collegeRole as CollegeRole | undefined,
        organizationName: data.organizationName || undefined,
      });

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-section p-4 py-8">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={eventgoLogo} alt="EventGo" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl text-white">Create your account</CardTitle>
          <CardDescription className="text-white/60">Join EventGo and start exploring</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* User Type Selection */}
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(userTypeInfo) as SignupUserType[]).map((type) => {
                  const info = userTypeInfo[type];
                  const Icon = info.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => form.setValue("userType", type)}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                        userType === type
                          ? "border-primary bg-primary/20"
                          : "border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${userType === type ? "text-primary" : "text-white/60"}`} />
                      <span className={`text-xs font-medium ${userType === type ? "text-primary" : "text-white/60"}`}>
                        {info.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your phone number" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Fields based on User Type */}
              {userType === "student" && (
                <>
                  <FormField
                    control={form.control}
                    name="collegeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">College Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your college name" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Graduation Year</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-white/20 bg-white/10 text-white">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {userType === "college" && (
                <>
                  <FormField
                    control={form.control}
                    name="collegeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">College/University Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter college name" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="collegeRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Your Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-white/20 bg-white/10 text-white">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="principal">Principal</SelectItem>
                            <SelectItem value="dean">Dean</SelectItem>
                            <SelectItem value="staff_coordinator">Staff Coordinator</SelectItem>
                            <SelectItem value="student_coordinator">Student Coordinator</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {userType === "company" && (
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your organization name" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-white/60">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
          <Link to="/" className="text-sm text-white/40 hover:text-white/60">
            ← Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
