import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import { Shield } from "lucide-react";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function AdminLogin() {
  const { login } = useCognitoAuth();

  return (
    <div className="flex min-h-screen items-center justify-center hero-section p-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={eventgoLogo} alt="EventGo" className="h-12 w-auto" />
          </div>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Login</CardTitle>
          <CardDescription className="text-white/60">Access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Use the secure EventGo admin sign-in page.
            </p>
            <Button type="button" className="w-full" onClick={login}>
              Continue to Admin Login
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link to="/login" className="text-sm text-white/60 hover:text-white/80">
            ← Back to regular login
          </Link>
          <Link to="/" className="text-sm text-white/40 hover:text-white/60">
            ← Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
