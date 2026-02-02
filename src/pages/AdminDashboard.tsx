import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Calendar, Edit, Trash2, Plus, 
  Shield, Search, UserCheck, UserX, Building2, GraduationCap 
} from "lucide-react";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_type: string;
  college_name: string | null;
  roll_number: string | null;
  college_id: string | null;
  branch: string | null;
  is_verified: boolean;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  created_by: string | null;
  is_featured: boolean | null;
}

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // New event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "workshop",
    start_date: "",
    end_date: "",
    location: "",
    is_featured: false,
  });

  useEffect(() => {
    if (!loading && (!user || profile?.user_type !== "admin")) {
      navigate("/");
      return;
    }
    
    if (user && profile?.user_type === "admin") {
      fetchUsers();
      fetchUserRoles();
      fetchEvents();
    }
  }, [user, profile, loading, navigate]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching users:", error);
      return;
    }
    setUsers(data || []);
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

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching events:", error);
      return;
    }
    setEvents(data || []);
  };

  const getUserRole = (userId: string) => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role;
  };

  const handleVerifyUser = async (userId: string, isVerified: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: isVerified })
      .eq("user_id", userId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: isVerified ? "User Verified" : "Verification Removed",
      description: `User has been ${isVerified ? "verified" : "unverified"}.`,
    });
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "User Deleted",
      description: "User has been removed from the system.",
    });
    fetchUsers();
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editingUser.full_name,
        email: editingUser.email,
        phone: editingUser.phone,
        college_name: editingUser.college_name,
        roll_number: editingUser.roll_number,
        college_id: editingUser.college_id,
        branch: editingUser.branch,
      })
      .eq("user_id", editingUser.user_id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "User Updated",
      description: "User details have been updated.",
    });
    setEditingUser(null);
    fetchUsers();
  };

  const handleAddEvent = async () => {
    const { error } = await supabase
      .from("events")
      .insert({
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
      description: "New event has been created.",
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
      description: "Event has been updated.",
    });
    setEditingEvent(null);
    fetchEvents();
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);
    
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
      description: "Event has been removed.",
    });
    fetchEvents();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.college_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || user.user_type === filterType;
    const matchesVerified = filterVerified === "all" || 
      (filterVerified === "verified" && user.is_verified) ||
      (filterVerified === "unverified" && !user.is_verified);
    
    return matchesSearch && matchesType && matchesVerified;
  });

  const stats = {
    totalUsers: users.length,
    students: users.filter(u => u.user_type === "student").length,
    collegeStaff: users.filter(u => u.user_type === "college").length,
    verified: users.filter(u => u.is_verified).length,
    pending: users.filter(u => !u.is_verified && u.user_type === "college").length,
    totalEvents: events.length,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, events, and platform settings</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.students}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">College Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats.collegeStaff}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.verified}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalEvents}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View, verify, edit, and manage all users</CardDescription>
                  </div>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col gap-4 pt-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="User Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="college">College Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterVerified} onValueChange={setFilterVerified}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Verification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.full_name}</span>
                          <Badge variant={user.user_type === "student" ? "secondary" : "default"}>
                            {user.user_type}
                          </Badge>
                          {user.user_type === "college" && getUserRole(user.user_id) && (
                            <Badge variant="outline">{getUserRole(user.user_id)}</Badge>
                          )}
                          {user.is_verified ? (
                            <Badge className="bg-green-500">Verified</Badge>
                          ) : (
                            <Badge variant="destructive">Unverified</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {user.roll_number && <span>Roll: {user.roll_number}</span>}
                          {user.college_id && <span>ID: {user.college_id}</span>}
                          {user.college_name && <span>College: {user.college_name}</span>}
                          {user.branch && <span>Branch: {user.branch}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {user.is_verified ? (
                          <Button variant="outline" size="sm" onClick={() => handleVerifyUser(user.user_id, false)}>
                            <UserX className="mr-1 h-4 w-4" />
                            Unverify
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" onClick={() => handleVerifyUser(user.user_id, true)}>
                            <UserCheck className="mr-1 h-4 w-4" />
                            Verify
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>Update user details</DialogDescription>
                            </DialogHeader>
                            {editingUser && (
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label>Full Name</Label>
                                  <Input
                                    value={editingUser.full_name}
                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Email</Label>
                                  <Input
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Phone</Label>
                                  <Input
                                    value={editingUser.phone || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>College Name</Label>
                                  <Input
                                    value={editingUser.college_name || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, college_name: e.target.value })}
                                  />
                                </div>
                                {editingUser.user_type === "student" && (
                                  <>
                                    <div className="grid gap-2">
                                      <Label>Roll Number</Label>
                                      <Input
                                        value={editingUser.roll_number || ""}
                                        onChange={(e) => setEditingUser({ ...editingUser, roll_number: e.target.value })}
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Branch</Label>
                                      <Input
                                        value={editingUser.branch || ""}
                                        onChange={(e) => setEditingUser({ ...editingUser, branch: e.target.value })}
                                      />
                                    </div>
                                  </>
                                )}
                                {editingUser.user_type === "college" && (
                                  <div className="grid gap-2">
                                    <Label>College ID</Label>
                                    <Input
                                      value={editingUser.college_id || ""}
                                      onChange={(e) => setEditingUser({ ...editingUser, college_id: e.target.value })}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <DialogFooter>
                              <Button onClick={handleUpdateUser}>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.user_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      No users found matching your criteria.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Event Management</CardTitle>
                    <CardDescription>Create, edit, and manage events</CardDescription>
                  </div>
                  <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Event
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.title}</span>
                          <Badge>{event.event_type}</Badge>
                          {event.is_featured && <Badge variant="secondary">Featured</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>📅 {new Date(event.start_date).toLocaleDateString()}</span>
                          {event.location && <span>📍 {event.location}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingEvent(event)}>
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
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
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      No events yet. Create your first event!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
