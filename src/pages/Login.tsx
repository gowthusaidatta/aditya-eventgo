import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function Login() {
  const { login } = useCognitoAuth();

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
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Continue to the secure EventGo sign-in page.
            </p>
            <Button type="button" className="w-full" onClick={login}>
              Continue to Login
            </Button>
          </div>
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
