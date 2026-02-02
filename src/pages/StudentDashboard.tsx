import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Code, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Registration {
  id: string;
  event_id: string;
  registered_at: string;
  status: string | null;
  events?: {
    title: string;
    start_date: string;
    event_type: string;
  };
}

interface HackathonRegistration {
  id: string;
  event_id: string;
  registered_at: string;
  status: string | null;
  events?: {
    title: string;
    start_date: string;
    event_type: string;
  };
}

export default function StudentDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [hackathonRegs, setHackathonRegs] = useState<HackathonRegistration[]>([]);

  useEffect(() => {
    if (!loading && (!user || profile?.user_type !== "student")) {
      navigate("/");
      return;
    }

    if (user) {
      fetchRegistrations();
    }
  }, [user, profile, loading, navigate]);

  const fetchRegistrations = async () => {
    // Fetch event registrations
    const { data: eventRegs } = await supabase
      .from("event_registrations")
      .select(`
        *,
        events (title, start_date, event_type)
      `)
      .eq("user_id", user?.id);

    // Fetch hackathon registrations
    const { data: hackRegs } = await supabase
      .from("hackathon_registrations")
      .select(`
        *,
        events (title, start_date, event_type)
      `)
      .eq("user_id", user?.id);

    setRegistrations(eventRegs || []);
    setHackathonRegs(hackRegs || []);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const allRegistrations = [
    ...registrations.map(r => ({ ...r, type: "event" as const })),
    ...hackathonRegs.map(r => ({ ...r, type: "hackathon" as const })),
  ].sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());

  const upcomingEvents = allRegistrations.filter(
    r => r.events && new Date(r.events.start_date) > new Date()
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.college_name} • {profile?.branch} • Class of {profile?.graduation_year}
          </p>
          {profile?.roll_number && (
            <p className="text-sm text-muted-foreground">Roll Number: {profile.roll_number}</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{registrations.length}</p>
                <p className="text-sm text-muted-foreground">Event Registrations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <Code className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hackathonRegs.length}</p>
                <p className="text-sm text-muted-foreground">Hackathon Registrations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <GraduationCap className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Your Upcoming Events</CardTitle>
              <CardDescription>Events and hackathons you've registered for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  No upcoming events. Explore events and hackathons to register!
                </div>
              ) : (
                upcomingEvents.slice(0, 5).map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{reg.events?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reg.events && new Date(reg.events.start_date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={reg.type === "hackathon" ? "default" : "secondary"}>
                        {reg.events?.event_type}
                      </Badge>
                      <Badge variant="outline">{reg.status || "Registered"}</Badge>
                    </div>
                  </div>
                ))
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/events")}>
                  Explore Events
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate("/hackathons")}>
                  Explore Hackathons
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* All Registrations */}
          <Card>
            <CardHeader>
              <CardTitle>All Registrations</CardTitle>
              <CardDescription>Your complete registration history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allRegistrations.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  You haven't registered for any events yet.
                </div>
              ) : (
                allRegistrations.slice(0, 5).map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{reg.events?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Registered on {new Date(reg.registered_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      reg.events && new Date(reg.events.start_date) > new Date() 
                        ? "default" 
                        : "secondary"
                    }>
                      {reg.events && new Date(reg.events.start_date) > new Date() ? "Upcoming" : "Completed"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
