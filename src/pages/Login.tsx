import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import { useAuth } from "@/contexts/AuthContext";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function Login() {
  const { loginWithPassword } = useCognitoAuth();
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      setIsSubmitting(false);
      setError("Server is taking too long. Please try again later.");
    }, 10000); // 10 seconds

    try {
      const result = await Promise.race([
        loginWithPassword({ username: username.trim(), password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
      ]);
      clearTimeout(timeout);
      if (didTimeout) return;
      setIsSubmitting(false);
      if (result.success) {
        await refreshProfile();
        navigate("/dashboard");
        return;
      }
      setError(result.message || "Login failed");
    } catch (err: any) {
      clearTimeout(timeout);
      if (didTimeout) return;
      setIsSubmitting(false);
      setError(err.message === "timeout" ? "Server is taking too long. Please try again later." : "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-section p-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={eventgoLogo} alt="EventGo" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
          <CardDescription className="text-white/60">Log in to your EventGo account</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-white/80">
                Email or phone number
              </Label>
              <Input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-white/80">
                Password
              </Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot your password?
          </Link>
          <p className="text-sm text-white/60">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
          <Link to="/admin-login" className="text-sm text-white/40 hover:text-white/60">
            Admin Login →
          </Link>
          <Link to="/" className="text-sm text-white/40 hover:text-white/60">
            ← Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
