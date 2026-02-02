import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { Menu, X, LogOut, User, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import eventgoLogo from "@/assets/eventgo-logo.png";
import adityaLogo from "@/assets/aditya-university-logo.jpg";

export function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardPath = () => {
    if (!profile) return "/dashboard";
    switch (profile.user_type) {
      case "student":
        return "/student-dashboard";
      case "college":
        return "/college-dashboard";
      case "admin":
        return "/admin-dashboard";
      default:
        return "/dashboard";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-secondary/20 bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-4">
          <img src={eventgoLogo} alt="EventGo" className="h-10 w-auto object-contain" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs text-white/60">in collaboration with</span>
            <img src={adityaLogo} alt="Aditya University" className="h-8 w-auto object-contain" />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/events" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            Events
          </Link>
          <Link to="/hackathons" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            Hackathons
          </Link>
          <Link to="/about" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            About
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white">
                  <User className="h-4 w-4" />
                  <span>{profile?.full_name || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(getDashboardPath())}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} className="text-white hover:bg-white/10 hover:text-white">
                Log In
              </Button>
              <Button onClick={() => navigate("/signup")} className="bg-primary hover:bg-primary/90">
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-secondary md:hidden">
          <div className="container py-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs text-white/60">in collaboration with</span>
              <img src={adityaLogo} alt="Aditya University" className="h-6 w-auto object-contain" />
            </div>
            <nav className="flex flex-col gap-4">
              <Link
                to="/events"
                className="text-sm font-medium text-white/70"
                onClick={() => setMobileMenuOpen(false)}
              >
                Events
              </Link>
              <Link
                to="/hackathons"
                className="text-sm font-medium text-white/70"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hackathons
              </Link>
              <Link
                to="/about"
                className="text-sm font-medium text-white/70"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <div className="flex flex-col gap-2 pt-4">
                {user ? (
                  <>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => { navigate(getDashboardPath()); setMobileMenuOpen(false); }}>
                      Dashboard
                    </Button>
                    <Button variant="ghost" className="text-white hover:bg-white/10" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}>
                      Log In
                    </Button>
                    <Button onClick={() => { navigate("/signup"); setMobileMenuOpen(false); }}>
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
