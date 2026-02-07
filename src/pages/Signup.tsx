import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function Signup() {
  const { signupWithPassword, confirmSignup, resendConfirmation } = useCognitoAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signup" | "confirm">("signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<"student" | "college">("student");
  const [collegeRole, setCollegeRole] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCollege = userType === "college";

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!collegeName.trim()) {
      setError("College name is required");
      return;
    }

    if (isCollege && !collegeRole) {
      setError("Select a college role");
      return;
    }

    setIsSubmitting(true);
    const result = await signupWithPassword({
      email: email.trim(),
      password,
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || "Sign up failed");
      return;
    }

    const pendingProfile = {
      email: email.trim(),
      full_name: name.trim() || undefined,
      phone: phone.trim() || null,
      user_type: isCollege ? "college" : "student",
      college_role: isCollege ? collegeRole : null,
      college_name: collegeName.trim() || null,
      college_id: isCollege ? collegeId.trim() || null : null,
      roll_number: !isCollege ? rollNumber.trim() || null : null,
      branch: !isCollege ? branch.trim() || null : null,
      graduation_year: !isCollege && graduationYear ? Number(graduationYear) : null,
      is_verified: isCollege ? false : true,
    };

    localStorage.setItem("pending_profile", JSON.stringify(pendingProfile));

    if (result.userConfirmed) {
      navigate("/login");
      return;
    }

    setStep("confirm");
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await confirmSignup({ username: email.trim(), code: code.trim() });
    setIsSubmitting(false);

    if (result.success) {
      navigate("/login");
      return;
    }

    setError(result.message || "Invalid confirmation code");
  };

  const handleResend = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await resendConfirmation({ username: email.trim() });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message || "Failed to resend code");
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
          <CardDescription className="text-white/60">
            Use the secure EventGo sign-up page to finish registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "signup" ? (
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="space-y-2">
                <Label htmlFor="signup-user-type" className="text-white/80">
                  Account type
                </Label>
                <Select value={userType} onValueChange={(value) => setUserType(value as "student" | "college")}>
                  <SelectTrigger id="signup-user-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="college">College Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isCollege && (
                <div className="space-y-2">
                  <Label htmlFor="signup-college-role" className="text-white/80">
                    College role
                  </Label>
                  <Select value={collegeRole} onValueChange={setCollegeRole}>
                    <SelectTrigger id="signup-college-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="dean">Dean</SelectItem>
                      <SelectItem value="staff_coordinator">Staff Coordinator</SelectItem>
                      <SelectItem value="student_coordinator">Student Coordinator</SelectItem>
                      <SelectItem value="host">Event Host</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-white/80">
                  Full name
                </Label>
                <Input
                  id="signup-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-white/80">
                  Email address
                </Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-phone" className="text-white/80">
                  Phone number (optional)
                </Label>
                <Input
                  id="signup-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-college-name" className="text-white/80">
                  College/University name
                </Label>
                <Input
                  id="signup-college-name"
                  name="collegeName"
                  type="text"
                  value={collegeName}
                  onChange={(event) => setCollegeName(event.target.value)}
                  placeholder="Your college or university"
                  required
                />
              </div>
              {!isCollege && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="signup-roll-number" className="text-white/80">
                      Roll number (optional)
                    </Label>
                    <Input
                      id="signup-roll-number"
                      name="rollNumber"
                      type="text"
                      value={rollNumber}
                      onChange={(event) => setRollNumber(event.target.value)}
                      placeholder="e.g., 20CS001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-branch" className="text-white/80">
                      Branch (optional)
                    </Label>
                    <Input
                      id="signup-branch"
                      name="branch"
                      type="text"
                      value={branch}
                      onChange={(event) => setBranch(event.target.value)}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-grad-year" className="text-white/80">
                      Graduation year (optional)
                    </Label>
                    <Input
                      id="signup-grad-year"
                      name="graduationYear"
                      type="number"
                      value={graduationYear}
                      onChange={(event) => setGraduationYear(event.target.value)}
                      placeholder="e.g., 2026"
                    />
                  </div>
                </>
              )}
              {isCollege && (
                <div className="space-y-2">
                  <Label htmlFor="signup-college-id" className="text-white/80">
                    College ID (optional)
                  </Label>
                  <Input
                    id="signup-college-id"
                    name="collegeId"
                    type="text"
                    value={collegeId}
                    onChange={(event) => setCollegeId(event.target.value)}
                    placeholder="Your staff ID"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-white/80">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm" className="text-white/80">
                  Confirm password
                </Label>
                <Input
                  id="signup-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleConfirm}>
              <p className="text-sm text-white/60">
                Enter the verification code sent to {email}.
              </p>
              <div className="space-y-2">
                <Label htmlFor="signup-code" className="text-white/80">
                  Verification code
                </Label>
                <Input
                  id="signup-code"
                  name="code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={isSubmitting}
              >
                Resend code
              </Button>
            </form>
          )}
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
