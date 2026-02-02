import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, BarChart3, PlusCircle, Eye, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CollegeDashboard() {
  const { profile, collegeRole } = useAuth();
  const _navigate = useNavigate();

  const canCreate = collegeRole === "principal" || collegeRole === "dean" || collegeRole === "staff_coordinator";
  const canEdit = collegeRole === "principal" || collegeRole === "dean";
  const canDelete = collegeRole === "principal" || collegeRole === "dean";
  const canViewReports = collegeRole === "principal" || collegeRole === "dean";

  const roleLabel = {
    principal: "Principal",
    dean: "Dean",
    staff_coordinator: "Staff Coordinator",
    student_coordinator: "Student Coordinator",
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">College Dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              {profile?.college_name} • {roleLabel[collegeRole as keyof typeof roleLabel]}
            </p>
          </div>
          {canCreate && (
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Event
            </Button>
          )}
        </div>

        {/* Role Permissions Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Your Permissions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={canCreate ? "default" : "secondary"}>
              {canCreate ? "✓" : "✗"} Create Events
            </Badge>
            <Badge variant={canEdit ? "default" : "secondary"}>
              {canEdit ? "✓" : "✗"} Edit Events
            </Badge>
            <Badge variant={canDelete ? "default" : "secondary"}>
              {canDelete ? "✓" : "✗"} Delete Events
            </Badge>
            <Badge variant={canViewReports ? "default" : "secondary"}>
              {canViewReports ? "✓" : "✗"} View Reports
            </Badge>
            <Badge variant="default">✓ View Registrations</Badge>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">458</p>
                <p className="text-sm text-muted-foreground">Registrations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          {canViewReports && (
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">85%</p>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>College Events</CardTitle>
            <CardDescription>Manage events for your college</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: "Tech Innovation Summit", date: "March 15, 2026", registrations: 150, status: "Upcoming" },
              { title: "Career Fair Spring 2026", date: "March 25, 2026", registrations: 300, status: "Upcoming" },
              { title: "Workshop: AI & ML", date: "February 20, 2026", registrations: 45, status: "Completed" },
            ].map((event, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex-1">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.date} • {event.registrations} registrations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={event.status === "Upcoming" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
