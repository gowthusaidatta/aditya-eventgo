import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, BarChart3, PlusCircle, Eye, Edit, Trash2, UserCheck, UserX, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  is_featured: boolean | null;
  created_by: string | null;
}

interface CollegeUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  college_id: string | null;
  college_name: string | null;
  is_verified: boolean;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function CollegeDashboard() {
  const { user, profile, collegeRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [collegeUsers, setCollegeUsers] = useState<CollegeUser[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // New event form
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "workshop",
    start_date: "",
    end_date: "",
    location: "",
    is_featured: false,
  });

  const canCreate = collegeRole === "principal" || collegeRole === "dean" || collegeRole === "staff_coordinator";
  const canEdit = collegeRole === "principal" || collegeRole === "dean";
  const canDelete = collegeRole === "principal" || collegeRole === "dean";
  const canViewReports = collegeRole === "principal" || collegeRole === "dean";
  const canVerifyUsers = collegeRole === "principal";
  const isVerified = profile?.is_verified;

  const roleLabel: Record<string, string> = {
    principal: "Principal",
    dean: "Dean",
    staff_coordinator: "Staff Coordinator",
    student_coordinator: "Student Coordinator",
  };

  useEffect(() => {
    if (!loading && (!user || profile?.user_type !== "college")) {
      navigate("/");
      return;
    }
    
    if (user && profile?.user_type === "college" && isVerified) {
      fetchEvents();
      if (canVerifyUsers) {
        fetchCollegeUsers();
        fetchUserRoles();
      }
    }
  }, [user, profile, loading, navigate, isVerified]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false });
    
    if (error) {
      console.error("Error fetching events:", error);
      return;
    }
    setEvents(data || []);

    // Fetch registration counts
    const counts: Record<string, number> = {};
    for (const event of (data || [])) {
      const { count } = await supabase
        .from("hackathon_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      counts[event.id] = count || 0;
    }
    setRegistrationCounts(counts);
  };

  const fetchCollegeUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_type", "college")
      .neq("user_id", user?.id);
    
    if (error) {
      console.error("Error fetching college users:", error);
      return;
    }
    setCollegeUsers(data || []);
  };

  const fetchUserRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*");
    
    if (error) {
      console.error("Error fetching roles:", error);
      return;
    }
    setUserRoles(data || []);
  };

  const getUserRole = (userId: string) => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role;
  };

  const handleVerifyUser = async (userId: string, verify: boolean) => {
    // Find the user being verified
    const targetUser = collegeUsers.find(u => u.user_id === userId);
    
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: verify })
      .eq("user_id", userId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
      return;
    }
    
    // Send verification email if verifying (not unverifying)
    if (verify && targetUser) {
      try {
        const response = await supabase.functions.invoke("send-verification-email", {
          body: {
            email: targetUser.email,
            fullName: targetUser.full_name,
            verifiedBy: profile?.full_name || "Principal",
            userType: "college",
            role: getUserRole(targetUser.user_id),
          },
        });
        
        if (response.error) {
          console.error("Failed to send verification email:", response.error);
        }
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
      }
    }
    
    toast({
      title: verify ? "User Verified" : "Verification Removed",
      description: `User has been ${verify ? "verified" : "unverified"}.`,
    });
    fetchCollegeUsers();
  };

  const handleAddEvent = async () => {
    const { error } = await supabase.from("events").insert({
      ...newEvent,
      created_by: user?.id,
    });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Event Created",
      description: "New event has been created successfully.",
    });
    setIsAddEventOpen(false);
    setNewEvent({
      title: "",
      description: "",
      event_type: "workshop",
      start_date: "",
      end_date: "",
      location: "",
      is_featured: false,
    });
    fetchEvents();
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    const { error } = await supabase
      .from("events")
      .update({
        title: editingEvent.title,
        description: editingEvent.description,
        event_type: editingEvent.event_type,
        start_date: editingEvent.start_date,
        end_date: editingEvent.end_date,
        location: editingEvent.location,
        is_featured: editingEvent.is_featured,
      })
      .eq("id", editingEvent.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Event Updated",
      description: "Event has been updated successfully.",
    });
    setEditingEvent(null);
    fetchEvents();
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Event Deleted",
      description: "Event has been deleted.",
    });
    fetchEvents();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Show pending verification message
  if (!isVerified) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container py-8">
          <Card className="mx-auto max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle>Verification Pending</CardTitle>
              <CardDescription>
                Your account is awaiting verification by the administrator.
                You will be able to access the dashboard once your account has been verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Role: {roleLabel[collegeRole as keyof typeof roleLabel] || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                College: {profile?.college_name}
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

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
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>Add a new event or hackathon</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Event title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Event description"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Event Type</Label>
                    <Select value={newEvent.event_type} onValueChange={(val) => setNewEvent({ ...newEvent, event_type: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                        <SelectItem value="hackathon">Hackathon</SelectItem>
                        <SelectItem value="fest">Fest</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.start_date}
                      onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.end_date}
                      onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Location</Label>
                    <Input
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Event location"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddEvent}>Create Event</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            <Badge variant={canVerifyUsers ? "default" : "secondary"}>
              {canVerifyUsers ? "✓" : "✗"} Verify Users
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
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(registrationCounts).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Registrations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Calendar className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {events.filter(e => new Date(e.start_date) > new Date()).length}
                </p>
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
                  <p className="text-2xl font-bold">{collegeUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Staff Members</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            {canVerifyUsers && <TabsTrigger value="users">Verify Users</TabsTrigger>}
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>College Events</CardTitle>
                <CardDescription>Manage events for your college</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {events.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No events yet. Create your first event!
                  </div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{event.title}</p>
                          <Badge>{event.event_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.start_date).toLocaleDateString()} • {registrationCounts[event.id] || 0} registrations
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={new Date(event.start_date) > new Date() ? "default" : "secondary"}>
                          {new Date(event.start_date) > new Date() ? "Upcoming" : "Completed"}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setEditingEvent(event)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Event</DialogTitle>
                              </DialogHeader>
                              {editingEvent && (
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label>Title</Label>
                                    <Input
                                      value={editingEvent.title}
                                      onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Description</Label>
                                    <Input
                                      value={editingEvent.description || ""}
                                      onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Location</Label>
                                    <Input
                                      value={editingEvent.location || ""}
                                      onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}
                              <DialogFooter>
                                <Button onClick={handleUpdateEvent}>Save Changes</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verify Users Tab (Principal only) */}
          {canVerifyUsers && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Verify College Users</CardTitle>
                  <CardDescription>Approve other college staff members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {collegeUsers.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No other college users to verify.
                    </div>
                  ) : (
                    collegeUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{u.full_name}</p>
                            {getUserRole(u.user_id) && (
                              <Badge variant="outline">{roleLabel[getUserRole(u.user_id) as string]}</Badge>
                            )}
                            {u.is_verified ? (
                              <Badge className="bg-green-500">Verified</Badge>
                            ) : (
                              <Badge variant="destructive">Pending</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                          {u.college_id && (
                            <p className="text-xs text-muted-foreground">ID: {u.college_id}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {u.is_verified ? (
                            <Button variant="outline" size="sm" onClick={() => handleVerifyUser(u.user_id, false)}>
                              <UserX className="mr-1 h-4 w-4" />
                              Revoke
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleVerifyUser(u.user_id, true)}>
                              <UserCheck className="mr-1 h-4 w-4" />
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
