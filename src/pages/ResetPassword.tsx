import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import { Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function ResetPassword() {
  const { login } = useCognitoAuth();

  return (
    <div className="flex min-h-screen items-center justify-center hero-section p-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={eventgoLogo} alt="EventGo" className="h-12 w-auto" />
          </div>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-white">Reset your password</CardTitle>
          <CardDescription className="text-white/60">
            Complete your reset securely through the EventGo sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3 text-white/80">
              <ShieldCheck className="h-5 w-5 text-white/70" />
              <p className="text-sm">
                Use the Cognito hosted UI to finish the reset flow.
              </p>
            </div>
            <Button type="button" className="w-full" onClick={login}>
              Continue to Login
            </Button>
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/60">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
