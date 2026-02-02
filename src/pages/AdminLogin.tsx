import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Shield } from "lucide-react";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", data.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.user_type !== "admin") {
        await supabase.auth.signOut();
        throw new Error("You don't have admin access");
      }
      
      toast({
        title: "Welcome, Admin!",
        description: "You have successfully logged in.",
      });
      navigate("/admin-dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Email</Label>
              <Input 
                type="email" 
                placeholder="Enter admin email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40" 
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login as Admin"}
            </Button>
          </form>
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
