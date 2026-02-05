import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Users, BarChart3, Settings, 
  GraduationCap, Building2, Shield, Trophy,
  Plus, Eye, UserCog, ClipboardList
} from "lucide-react";

export default function Dashboard() {
  const { user, profile, collegeRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = profile?.user_type === "admin";
  const isCollege = profile?.user_type === "college";
  const isStudent = profile?.user_type === "student";
  
  // College role checks
  const isPrincipal = collegeRole === "principal";
  const isDean = collegeRole === "dean";
  const isStaffCoordinator = collegeRole === "staff_coordinator";
  const isStudentCoordinator = collegeRole === "student_coordinator";
  const isHost = collegeRole === "host";
  
  // Permission checks
  const canCreateEvents = isAdmin || isPrincipal || isDean || isStaffCoordinator || isHost;
  const canViewAllRegistrations = isAdmin || isPrincipal || isDean;
  const canManageUsers = isAdmin || isPrincipal;
  const canViewAnalytics = isAdmin;

  const dashboardCards = [];

  // Common cards for all users
  dashboardCards.push({
    title: "Browse Events",
    description: "Discover upcoming events and hackathons",
    icon: Calendar,
    action: () => navigate("/events"),
    variant: "default" as const,
  });

  if (isStudent) {
    dashboardCards.push({
      title: "My Registrations",
      description: "View your event registrations",
      icon: ClipboardList,
      action: () => navigate("/student-dashboard"),
      variant: "default" as const,
    });
  }

  // Event creation for authorized users
  if (canCreateEvents) {
    dashboardCards.push({
      title: "Create Event",
      description: "Create a new event or hackathon",
      icon: Plus,
      action: () => navigate("/create-event"),
      variant: "primary" as const,
    });
    dashboardCards.push({
      title: "My Events",
      description: "Manage your created events",
      icon: Settings,
      action: () => navigate("/organizer-dashboard"),
      variant: "default" as const,
    });
  }

  // College staff dashboards
  if (isCollege) {
    dashboardCards.push({
      title: "College Dashboard",
      description: "Manage college events and users",
      icon: Building2,
      action: () => navigate("/college-dashboard"),
      variant: "default" as const,
    });
  }

  // Admin-specific cards
  if (isAdmin) {
    dashboardCards.push({
      title: "Admin Dashboard",
      description: "Full platform administration",
      icon: Shield,
      action: () => navigate("/admin-dashboard"),
      variant: "default" as const,
    });
    dashboardCards.push({
      title: "Analytics",
      description: "View platform analytics and reports",
      icon: BarChart3,
      action: () => navigate("/analytics"),
      variant: "default" as const,
    });
    dashboardCards.push({
      title: "User Management",
      description: "Manage users and permissions",
      icon: UserCog,
      action: () => navigate("/admin-dashboard"),
      variant: "default" as const,
    });
  }

  // Role-specific dashboards
  dashboardCards.push({
    title: "Profile",
    description: "Manage your account settings",
    icon: Users,
    action: () => navigate("/profile"),
    variant: "default" as const,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name || "User"}!</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize">
              {profile?.user_type || "user"}
            </Badge>
            {collegeRole && (
              <Badge variant="secondary" className="capitalize">
                {collegeRole.replace("_", " ")}
              </Badge>
            )}
            {!profile?.is_verified && (
              <Badge variant="destructive">Pending Verification</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            {isAdmin && "Full platform access - manage all events, users, and analytics"}
            {isPrincipal && "Principal access - full college administration and event approval"}
            {isDean && "Dean access - manage college events and approve staff actions"}
            {isStaffCoordinator && "Staff Coordinator - create events and manage student coordinators"}
            {isStudentCoordinator && "Student Coordinator - view assigned events"}
            {isHost && "Event Host - create and manage your events"}
            {isStudent && "Browse and register for events and hackathons"}
          </p>
        </div>

        {/* Quick Stats for Admin */}
        {isAdmin && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="text-2xl">--</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/analytics")}>
                  View details →
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Events</CardDescription>
                <CardTitle className="text-2xl">--</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/events")}>
                  View events →
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Registrations</CardDescription>
                <CardTitle className="text-2xl">--</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/analytics")}>
                  View analytics →
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending Approvals</CardDescription>
                <CardTitle className="text-2xl">--</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/admin-dashboard")}>
                  Review →
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card 
                key={index} 
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  card.variant === "primary" ? "border-primary bg-primary/5" : ""
                }`}
                onClick={card.action}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      card.variant === "primary" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Verification Notice */}
        {!profile?.is_verified && (
          <Card className="mt-8 border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">Account Pending Verification</p>
                  <p className="text-sm text-muted-foreground">
                    {isCollege 
                      ? "Your account is awaiting verification by an admin or principal. Some features may be limited."
                      : "Please verify your email to access all features."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
