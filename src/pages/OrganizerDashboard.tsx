import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/integrations/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Users, 
  Trophy, 
  ClipboardCheck, 
  Plus, 
  BarChart3,
  QrCode,
  Settings
} from "lucide-react";
import { QRCheckIn } from "@/components/QRCheckIn";
import { Leaderboard } from "@/components/Leaderboard";
import { EventPermissionsManager } from "@/components/EventPermissionsManager";

interface Event {
  id: string;
  eventId?: string;
  title: string;
  event_type: string;
  start_date: string;
  status: string;
  is_hackathon: boolean;
  registrations_count?: number;
}

export default function OrganizerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    activeEvents: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const eventsData = await apiClient.getEvents({ createdBy: user.id });
      const normalizedEvents = (Array.isArray(eventsData) ? eventsData : [])
        .map((event) => ({
          ...event,
          id: event.eventId || event.id,
          start_date: event.start_date || event.startDate,
        }))
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

      setEvents(normalizedEvents);

      if (normalizedEvents.length > 0) {
        setSelectedEvent(normalizedEvents[0]);
      }

      const counts = await Promise.all(
        normalizedEvents.map((event) => apiClient.getRegistrationCount(event.id))
      );
      const totalRegistrations = counts.reduce((sum, data) => sum + (data?.count || 0), 0);

      setStats({
        totalEvents: normalizedEvents.length,
        totalRegistrations,
        activeEvents: normalizedEvents.filter((event) =>
          event.status === "published" || event.status === "ongoing"
        ).length,
        totalRevenue: 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error loading data",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
            <p className="text-muted-foreground">Manage your events and hackathons</p>
          </div>
          <Button onClick={() => navigate("/create-event")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events</CardDescription>
              <CardTitle className="text-3xl">{stats.totalEvents}</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Registrations</CardDescription>
              <CardTitle className="text-3xl">{stats.totalRegistrations}</CardTitle>
            </CardHeader>
            <CardContent>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Events</CardDescription>
              <CardTitle className="text-3xl">{stats.activeEvents}</CardTitle>
            </CardHeader>
            <CardContent>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-3xl">₹{stats.totalRevenue.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Event Selector */}
        {events.length > 0 ? (
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Select Event</label>
            <div className="flex flex-wrap gap-2">
              {events.map((event) => (
                <Button
                  key={event.id}
                  variant={selectedEvent?.id === event.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedEvent(event)}
                >
                  {event.title}
                  {event.is_hackathon && (
                    <Badge variant="secondary" className="ml-2">Hackathon</Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No events yet</h3>
              <p className="text-muted-foreground mb-4">Create your first event to get started</p>
              <Button onClick={() => navigate("/create-event")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Event Management Tabs */}
        {selectedEvent && (
          <Tabs defaultValue="registrations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="registrations">
                <Users className="h-4 w-4 mr-2" />
                Registrations
              </TabsTrigger>
              <TabsTrigger value="check-in">
                <QrCode className="h-4 w-4 mr-2" />
                Check-In
              </TabsTrigger>
              {selectedEvent.is_hackathon && (
                <>
                  <TabsTrigger value="leaderboard">
                    <Trophy className="h-4 w-4 mr-2" />
                    Leaderboard
                  </TabsTrigger>
                  <TabsTrigger value="judging">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Judging
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registrations">
              <RegistrationsPanel eventId={selectedEvent.id} />
            </TabsContent>

            <TabsContent value="check-in">
              <QRCheckIn eventId={selectedEvent.id} />
            </TabsContent>

            {selectedEvent.is_hackathon && (
              <>
                <TabsContent value="leaderboard">
                  <Leaderboard eventId={selectedEvent.id} />
                </TabsContent>
                <TabsContent value="judging">
                  <JudgingManagement eventId={selectedEvent.id} />
                </TabsContent>
              </>
            )}

            <TabsContent value="settings">
              <EventSettings event={selectedEvent} onUpdate={fetchData} />
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
}

// Registrations Panel Component
function RegistrationsPanel({ eventId }: { eventId: string }) {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, [eventId]);

  const fetchRegistrations = async () => {
    const data = await apiClient.getEventRegistrations(eventId);
    const items = Array.isArray(data) ? data : [];
    const userIds = items.map((r) => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const profiles = await apiClient.getUsersByIds(userIds);
      const registrationsWithProfiles = items.map((r) => ({
        ...r,
        profile: profiles.find((p: any) => p.userId === r.user_id) || null,
      }));
      setRegistrations(registrationsWithProfiles);
    } else {
      setRegistrations([]);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Roll Number", "College", "Status", "Registered At", "Checked In"];
    const rows = registrations.map(r => [
      r.profile?.full_name || r.registrant?.full_name || r.full_name || "",
      r.profile?.email || r.registrant?.email || r.email || "",
      r.profile?.roll_number || r.registrant?.roll_number || r.roll_number || "",
      r.profile?.college_name || r.registrant?.college_name || r.college_name || "",
      r.registration_status || r.status,
      new Date(r.registered_at || r.createdAt || r.created_at).toLocaleString(),
      r.check_in_time ? new Date(r.check_in_time).toLocaleString() : "No",
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations_${eventId}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Registrations</CardTitle>
          <CardDescription>{registrations.length} total registrations</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No registrations yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">College</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg.registration_id || reg.id || `${reg.event_id}:${reg.user_id}`} className="border-b">
                    <td className="py-2">
                      {reg.profile?.full_name || reg.registrant?.full_name || reg.full_name || "N/A"}
                    </td>
                    <td className="py-2">
                      {reg.profile?.email || reg.registrant?.email || reg.email || "N/A"}
                    </td>
                    <td className="py-2">
                      {reg.profile?.college_name || reg.registrant?.college_name || reg.college_name || "N/A"}
                    </td>
                    <td className="py-2">
                      <Badge variant={reg.registration_status === "attended" ? "default" : "outline"}>
                        {reg.registration_status || reg.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {reg.check_in_time ? (
                        <span className="text-primary">✓ {new Date(reg.check_in_time).toLocaleTimeString()}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Judging Management Component
function JudgingManagement({ eventId }: { eventId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, [eventId]);

  const fetchSubmissions = async () => {
    const [submissionsData, teamsData] = await Promise.all([
      apiClient.getSubmissions({ eventId }),
      apiClient.getTeams(eventId),
    ]);

    const teams = Array.isArray(teamsData) ? teamsData : [];
    const items = (Array.isArray(submissionsData) ? submissionsData : [])
      .filter((sub) => sub.status === "submitted")
      .map((sub) => ({
        ...sub,
        id: sub.submission_id || sub.id,
        team: {
          name: teams.find((team: any) => team.team_id === sub.team_id)?.name || "Unknown",
        },
      }))
      .sort((a, b) => new Date(b.submitted_at || b.updated_at || 0).getTime() - new Date(a.submitted_at || a.updated_at || 0).getTime());

    setSubmissions(items);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions for Judging</CardTitle>
        <CardDescription>{submissions.length} submissions pending review</CardDescription>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No submissions yet</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{sub.title}</h4>
                  <p className="text-sm text-muted-foreground">Team: {sub.team?.name}</p>
                  <Badge variant="outline" className="mt-1">{sub.round}</Badge>
                </div>
                <Button variant="outline" size="sm">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Review
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Event Settings Component
function EventSettings({ event, onUpdate }: { event: Event; onUpdate: () => void }) {
  const { toast } = useToast();

  const handlePublish = async () => {
    try {
      await apiClient.updateEvent(event.id, { status: "published" });
      toast({ title: "Published!", description: "Event is now live" });
      onUpdate();
    } catch (error) {
      toast({ title: "Error", description: "Failed to publish event", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Settings</CardTitle>
          <CardDescription>Manage event configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Event Status</h4>
              <p className="text-sm text-muted-foreground">Current status: {event.status}</p>
            </div>
            {event.status === "draft" && (
              <Button onClick={handlePublish}>Publish Event</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Management */}
      <EventPermissionsManager eventId={event.id} eventTitle={event.title} />
    </div>
  );
}
