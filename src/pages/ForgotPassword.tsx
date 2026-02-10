import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function ForgotPassword() {
  const { startPasswordReset, confirmPasswordReset } = useCognitoAuth();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await startPasswordReset({ username: username.trim() });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || "Failed to start reset");
      return;
    }

    setStep("confirm");
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await confirmPasswordReset({
      username: username.trim(),
      code: code.trim(),
      newPassword,
    });
    setIsSubmitting(false);

    if (result.success) {
      setStep("request");
      setCode("");
      setNewPassword("");
      return;
    }

    setError(result.message || "Reset failed");
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-section p-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={eventgoLogo} alt="EventGo" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl text-white">Forgot password?</CardTitle>
          <CardDescription className="text-white/60">
            Reset your password securely via the EventGo sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "request" ? (
            <form className="space-y-4" onSubmit={handleRequest}>
              <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3 text-white/80">
                <ShieldCheck className="h-5 w-5 text-white/70" />
                <p className="text-sm">
                  We will send a verification code to reset your password.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-username" className="text-white/80">
                  Email or phone number
                </Label>
                <Input
                  id="forgot-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending code..." : "Send reset code"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleConfirm}>
              <div className="space-y-2">
                <Label htmlFor="forgot-code" className="text-white/80">
                  Verification code
                </Label>
                <Input
                  id="forgot-code"
                  name="code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-password" className="text-white/80">
                  New password
                </Label>
                <Input
                  id="forgot-password"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link to="/login" className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
