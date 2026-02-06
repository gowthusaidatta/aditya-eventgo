import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function ForgotPassword() {
  const { login } = useCognitoAuth();

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
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3 text-white/80">
              <ShieldCheck className="h-5 w-5 text-white/70" />
              <p className="text-sm">
                Use the Cognito hosted login to request a password reset.
              </p>
            </div>
            <Button type="button" className="w-full" onClick={login}>
              Go to Login
            </Button>
          </div>
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
