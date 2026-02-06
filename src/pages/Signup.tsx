import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function Signup() {
  const { signup } = useCognitoAuth();

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
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Continue to the hosted signup and complete your profile after login.
            </p>
            <Button type="button" className="w-full" onClick={signup}>
              Continue to Sign Up
            </Button>
          </div>
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
