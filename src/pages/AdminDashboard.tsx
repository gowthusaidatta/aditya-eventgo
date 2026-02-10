import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/integrations/api/apiClient";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EventMediaUpload } from "@/components/EventMediaUpload";
import { EventShareDialog } from "@/components/EventShareDialog";
import { EventPermissionsManager } from "@/components/EventPermissionsManager";
import { 
  Users, Calendar, Edit, Trash2, Plus, 
  Shield, Search, UserCheck, UserX, Building2, GraduationCap, Share2, BarChart3
} from "lucide-react";

interface User {
  id?: string;
  user_id?: string;
  userId?: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_type: string;
  college_name: string | null;
  roll_number: string | null;
  college_id: string | null;
  branch: string | null;
  is_verified: boolean;
  college_role?: string | null;
  permissions?: string[];
  created_at?: string;
}

interface Event {
  id: string;
  eventId?: string;
  title: string;
  description: string | null;
  full_description?: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  video_url: string | null;
  created_by: string | null;
  is_featured: boolean | null;
  mode?: string | null;
  online_link?: string | null;
  registration_deadline?: string | null;
  is_hackathon?: boolean | null;
  team_size_min?: number | null;
  team_size_max?: number | null;
  tags?: string[];
  venue_details?: Record<string, unknown> | null;
  created_at?: string;
}

type EditableEvent = Event & {
  tags_input?: string;
  skills_input?: string;
  festival_campaign?: string;
  website_url?: string;
  theme?: string;
  participation_type?: "individual" | "team";
  team_size_min_input?: string;
  team_size_max_input?: string;
  who_can_register?: string;
  college_organization?: string;
  gender_criteria?: string;
  mode?: string;
  online_link?: string;
  registration_deadline?: string;
};

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const superAdminEmails = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || "Datta@gmail.com")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const isSuperAdminUser = (candidate: User) => {
    if (!candidate?.email) return false;
    return superAdminEmails.includes(candidate.email.toLowerCase());
  };
  
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingEvent, setEditingEvent] = useState<EditableEvent | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [sharingEvent, setSharingEvent] = useState<Event | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [rolePermissionsLoading, setRolePermissionsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("college:principal");
  const [rolePermissionsDraft, setRolePermissionsDraft] = useState<string[]>([]);

  const roleLabel: Record<string, string> = {
    principal: "Principal",
    dean: "Dean",
    staff_coordinator: "Staff Coordinator",
    student_coordinator: "Student Coordinator",
    host: "Event Host",
  };

  const permissionOptions = [
    { id: "create_event", label: "Create event" },
    { id: "edit_event", label: "Edit event" },
    { id: "delete_event", label: "Delete event" },
    { id: "manage_users", label: "Manage users" },
    { id: "manage_registrations", label: "Manage registrations" },
    { id: "grant_permissions", label: "Grant permissions" },
    { id: "full_access", label: "Full access" },
  ];

  const collegeRoleOptions = [
    { id: "college:principal", label: "Principal" },
    { id: "college:dean", label: "Dean" },
    { id: "college:staff_coordinator", label: "Staff Coordinator" },
    { id: "college:student_coordinator", label: "Student Coordinator" },
    { id: "college:host", label: "Event Host" },
  ];

  // New event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    full_description: "",
    event_type: "workshop",
    start_date: "",
    end_date: "",
    location: "",
    image_url: null as string | null,
    video_url: null as string | null,
    is_featured: false,
    mode: "offline",
    online_link: "",
    registration_deadline: "",
    tags_input: "",
    skills_input: "",
    festival_campaign: "",
    website_url: "",
    theme: "",
    participation_type: "individual" as "individual" | "team",
    team_size_min_input: "1",
    team_size_max_input: "1",
    who_can_register: "Everyone can apply",
    college_organization: "Everyone can apply",
    gender_criteria: "Everyone can apply",
  });

  useEffect(() => {
    if (!loading && (!user || profile?.user_type !== "admin")) {
      navigate("/");
      return;
    }
    
    if (user && profile?.user_type === "admin") {
      fetchUsers();
      fetchEvents();
      fetchRolePermissions();
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    setRolePermissionsDraft(rolePermissions[selectedRole] || []);
  }, [selectedRole, rolePermissions]);

  const fetchUsers = async () => {
    const data = await apiClient.listUsers();
    const list = Array.isArray(data) ? data : [];
    const normalized = list
      .map((item) => ({
        ...item,
        user_id: item.user_id || item.userId,
        userId: item.userId || item.user_id,
        id: item.id || item.userId || item.user_id,
      }))
      .sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
    setUsers(normalized);
  };

  const fetchEvents = async () => {
    const data = await apiClient.getEvents();
    const normalized = (Array.isArray(data) ? data : [])
      .map((event) => ({
        ...event,
        id: event.eventId || event.id,
      }))
      .sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
    setEvents(normalized);
  };

  const fetchRolePermissions = async () => {
    setRolePermissionsLoading(true);
    try {
      const items = await apiClient.getRolePermissions();
      const map: Record<string, string[]> = {};
      (Array.isArray(items) ? items : []).forEach((item) => {
        if (item?.role_id) {
          map[item.role_id] = Array.isArray(item.permissions) ? item.permissions : [];
        }
      });
      setRolePermissions(map);
      setRolePermissionsDraft(map[selectedRole] || []);
    } catch (error) {
      console.error("Error loading role permissions:", error);
    } finally {
      setRolePermissionsLoading(false);
    }
  };

  const getUserRole = (userId: string) => {
    const role = users.find(u => (u.user_id || u.userId) === userId)?.college_role;
    return role || null;
  };

  const handleVerifyUser = async (userId: string, isVerified: boolean) => {
    try {
      await apiClient.updateUserProfile(userId, { is_verified: isVerified });
    } catch (error) {
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
    try {
      await apiClient.deleteUser(userId);
    } catch (error) {
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

    try {
      await apiClient.updateUserProfile(editingUser.user_id || editingUser.userId || "", {
        full_name: editingUser.full_name,
        email: editingUser.email,
        phone: editingUser.phone,
        college_name: editingUser.college_name,
        roll_number: editingUser.roll_number,
        college_id: editingUser.college_id,
        branch: editingUser.branch,
        permissions: editingUser.permissions || [],
      });
    } catch (error) {
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
    const eventMode = newEvent.mode || "offline";
    if (eventMode !== "online" && !newEvent.location.trim()) {
      toast({
        title: "Error",
        description: "Location is required for offline or hybrid events",
        variant: "destructive",
      });
      return;
    }

    if (eventMode !== "offline" && !newEvent.online_link.trim()) {
      toast({
        title: "Error",
        description: "Online link is required for online or hybrid events",
        variant: "destructive",
      });
      return;
    }

    if (newEvent.registration_deadline && new Date(newEvent.registration_deadline) > new Date(newEvent.start_date)) {
      toast({
        title: "Error",
        description: "Registration deadline must be before the start date",
        variant: "destructive",
      });
      return;
    }

    if (newEvent.website_url.trim() && !/^https?:\/\//i.test(newEvent.website_url.trim())) {
      toast({
        title: "Error",
        description: "Website URL must start with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    const cleanTags = newEvent.tags_input
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    const cleanSkills = newEvent.skills_input
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
    const participationType =
      newEvent.participation_type || (newEvent.event_type === "hackathon" ? "team" : "individual");
    const useTeamSizes = participationType === "team" || newEvent.event_type === "hackathon";
    const minTeamSize = parseInt(newEvent.team_size_min_input, 10);
    const maxTeamSize = parseInt(newEvent.team_size_max_input, 10);
    if (useTeamSizes && (
      Number.isNaN(minTeamSize) ||
      Number.isNaN(maxTeamSize) ||
      minTeamSize < 1 ||
      maxTeamSize < minTeamSize
    )) {
      toast({
        title: "Error",
        description: "Please enter a valid team size range",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        full_description: newEvent.full_description,
        event_type: newEvent.event_type,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date || null,
        location: newEvent.location,
        mode: eventMode,
        online_link: eventMode !== "offline" ? newEvent.online_link.trim() : null,
        registration_deadline: newEvent.registration_deadline
          ? new Date(newEvent.registration_deadline).toISOString()
          : null,
        is_hackathon: newEvent.event_type === "hackathon",
        team_size_min: useTeamSizes ? minTeamSize : 1,
        team_size_max: useTeamSizes ? maxTeamSize : 1,
        image_url: newEvent.image_url,
        video_url: newEvent.video_url,
        is_featured: newEvent.is_featured,
        tags: cleanTags,
        venue_details: {
          festival_campaign: newEvent.festival_campaign.trim() || null,
          website: newEvent.website_url.trim() || null,
          theme: newEvent.theme.trim() || null,
          skills: cleanSkills,
          registration_criteria: {
            who_can_register: newEvent.who_can_register.trim() || "Everyone can apply",
            college_organization: newEvent.college_organization.trim() || "Everyone can apply",
            gender: newEvent.gender_criteria.trim() || "Everyone can apply",
          },
        },
        created_by: user?.id,
      });
    } catch (error) {
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
      full_description: "",
      event_type: "workshop",
      start_date: "",
      end_date: "",
      location: "",
      image_url: null,
      video_url: null,
      is_featured: false,
      mode: "offline",
      online_link: "",
      registration_deadline: "",
      tags_input: "",
      skills_input: "",
      festival_campaign: "",
      website_url: "",
      theme: "",
      participation_type: "individual",
      team_size_min_input: "1",
      team_size_max_input: "1",
      who_can_register: "Everyone can apply",
      college_organization: "Everyone can apply",
      gender_criteria: "Everyone can apply",
    });
    fetchEvents();
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    setEditFormError(null);
    const eventMode = editingEvent.mode || "offline";
    if (eventMode !== "online" && !editingEvent.location?.trim()) {
      setEditFormError("Location is required for offline or hybrid events.");
      toast({
        title: "Error",
        description: "Location is required for offline or hybrid events",
        variant: "destructive",
      });
      return;
    }

    if (eventMode !== "offline" && !editingEvent.online_link?.trim()) {
      setEditFormError("Online link is required for online or hybrid events.");
      toast({
        title: "Error",
        description: "Online link is required for online or hybrid events",
        variant: "destructive",
      });
      return;
    }

    if (editingEvent.registration_deadline && new Date(editingEvent.registration_deadline) > new Date(editingEvent.start_date)) {
      setEditFormError("Registration deadline must be before the start date.");
      toast({
        title: "Error",
        description: "Registration deadline must be before the start date",
        variant: "destructive",
      });
      return;
    }

    if (editingEvent.website_url?.trim() && !/^https?:\/\//i.test(editingEvent.website_url.trim())) {
      setEditFormError("Website URL must start with http:// or https://.");
      toast({
        title: "Error",
        description: "Website URL must start with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    const cleanTags = (editingEvent.tags_input || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    const cleanSkills = (editingEvent.skills_input || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
    const participationType =
      editingEvent.participation_type || (editingEvent.event_type === "hackathon" ? "team" : "individual");
    const useTeamSizes = participationType === "team" || editingEvent.event_type === "hackathon";
    const minTeamSize = parseInt(editingEvent.team_size_min_input || "1", 10);
    const maxTeamSize = parseInt(editingEvent.team_size_max_input || "1", 10);
    if (useTeamSizes && (
      Number.isNaN(minTeamSize) ||
      Number.isNaN(maxTeamSize) ||
      minTeamSize < 1 ||
      maxTeamSize < minTeamSize
    )) {
      setEditFormError("Please enter a valid team size range.");
      toast({
        title: "Error",
        description: "Please enter a valid team size range",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.updateEvent(editingEvent.id, {
        title: editingEvent.title,
        description: editingEvent.description,
        full_description: editingEvent.full_description,
        event_type: editingEvent.event_type,
        start_date: editingEvent.start_date,
        end_date: editingEvent.end_date,
        location: editingEvent.location,
        mode: eventMode,
        online_link: eventMode !== "offline" ? editingEvent.online_link?.trim() : null,
        registration_deadline: editingEvent.registration_deadline
          ? new Date(editingEvent.registration_deadline).toISOString()
          : null,
        is_hackathon: editingEvent.event_type === "hackathon",
        team_size_min: useTeamSizes ? minTeamSize : 1,
        team_size_max: useTeamSizes ? maxTeamSize : 1,
        image_url: editingEvent.image_url,
        video_url: editingEvent.video_url,
        is_featured: editingEvent.is_featured,
        tags: cleanTags,
        venue_details: {
          festival_campaign: editingEvent.festival_campaign?.trim() || null,
          website: editingEvent.website_url?.trim() || null,
          theme: editingEvent.theme?.trim() || null,
          skills: cleanSkills,
          registration_criteria: {
            who_can_register: editingEvent.who_can_register?.trim() || "Everyone can apply",
            college_organization: editingEvent.college_organization?.trim() || "Everyone can apply",
            gender: editingEvent.gender_criteria?.trim() || "Everyone can apply",
          },
        },
      });
    } catch (error) {
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
    try {
      await apiClient.deleteEvent(eventId);
    } catch (error) {
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

  const normalizeEditableEvent = (event: Event): EditableEvent => {
    const venueDetails = (event.venue_details || {}) as Record<string, unknown>;
    const registrationCriteria =
      (venueDetails.registration_criteria as Record<string, unknown> | undefined) || {};
    const tagsInput = Array.isArray(event.tags) ? event.tags.join(", ") : "";
    const skillsInput = Array.isArray(venueDetails.skills)
      ? (venueDetails.skills as string[]).filter(Boolean).join(", ")
      : typeof venueDetails.skills === "string"
        ? venueDetails.skills
        : "";
    return {
      ...event,
      tags_input: tagsInput,
      skills_input: skillsInput,
      festival_campaign:
        (typeof venueDetails.festival_campaign === "string" && venueDetails.festival_campaign) || "",
      website_url: (typeof venueDetails.website === "string" && venueDetails.website) || "",
      theme: (typeof venueDetails.theme === "string" && venueDetails.theme) || "",
      participation_type: event.team_size_max && event.team_size_max > 1 ? "team" : "individual",
      team_size_min_input: String(event.team_size_min ?? 1),
      team_size_max_input: String(event.team_size_max ?? event.team_size_min ?? 1),
      who_can_register:
        (typeof registrationCriteria.who_can_register === "string" && registrationCriteria.who_can_register) ||
        "Everyone can apply",
      college_organization:
        (typeof registrationCriteria.college_organization === "string" && registrationCriteria.college_organization) ||
        "Everyone can apply",
      gender_criteria:
        (typeof registrationCriteria.gender === "string" && registrationCriteria.gender) ||
        "Everyone can apply",
      mode: event.mode || "offline",
      online_link: event.online_link || "",
      registration_deadline: event.registration_deadline || "",
    };
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
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users, events, and platform settings</p>
            </div>
          </div>
          <Button onClick={() => navigate("/analytics")} variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            View Analytics
          </Button>
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
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" />
              Permissions
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
                          {user.user_type === "college" && getUserRole(user.user_id || user.userId || "") && (
                            <Badge variant="outline">
                              {roleLabel[getUserRole(user.user_id || user.userId || "") as string] ||
                                getUserRole(user.user_id || user.userId || "")}
                            </Badge>
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
                          <Button variant="outline" size="sm" onClick={() => handleVerifyUser(user.user_id || user.userId || "", false)}>
                            <UserX className="mr-1 h-4 w-4" />
                            Unverify
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" onClick={() => handleVerifyUser(user.user_id || user.userId || "", true)}>
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
                                {editingUser.user_type === "college" && (
                                  <div className="grid gap-2">
                                    <Label>User Permissions</Label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {permissionOptions.map((option) => (
                                        <label key={option.id} className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={(editingUser.permissions || []).includes(option.id)}
                                            onChange={(event) => {
                                              const next = new Set(editingUser.permissions || []);
                                              if (event.target.checked) {
                                                next.add(option.id);
                                              } else {
                                                next.delete(option.id);
                                              }
                                              setEditingUser({ ...editingUser, permissions: Array.from(next) });
                                            }}
                                          />
                                          {option.label}
                                        </label>
                                      ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      These permissions override role defaults for this user.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                            <DialogFooter>
                              <Button onClick={handleUpdateUser}>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isSuperAdminUser(user)}
                          title={isSuperAdminUser(user) ? "Super admin accounts cannot be deleted" : undefined}
                          onClick={() => handleDeleteUser(user.user_id || user.userId || "")}
                        >
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
                          <Label>Full Description</Label>
                          <Textarea
                            value={newEvent.full_description}
                            onChange={(e) => setNewEvent({ ...newEvent, full_description: e.target.value })}
                            placeholder="Complete event details"
                            rows={4}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Event Type</Label>
                          <Select
                            value={newEvent.event_type}
                            onValueChange={(val) =>
                              setNewEvent({
                                ...newEvent,
                                event_type: val,
                                participation_type: val === "hackathon" ? "team" : newEvent.participation_type,
                              })
                            }
                          >
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
                        <div className="grid gap-2">
                          <Label>Event Mode</Label>
                          <Select
                            value={newEvent.mode}
                            onValueChange={(val) => setNewEvent({ ...newEvent, mode: val })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="offline">Offline</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newEvent.mode !== "offline" && (
                          <div className="grid gap-2">
                            <Label>Online Link</Label>
                            <Input
                              value={newEvent.online_link}
                              onChange={(e) => setNewEvent({ ...newEvent, online_link: e.target.value })}
                              placeholder="https://..."
                            />
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label>Registration Deadline</Label>
                          <Input
                            type="datetime-local"
                            value={newEvent.registration_deadline}
                            onChange={(e) => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Tags</Label>
                          <Input
                            value={newEvent.tags_input}
                            onChange={(e) => setNewEvent({ ...newEvent, tags_input: e.target.value })}
                            placeholder="e.g., AI, Web, Design"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Skills or Tags to Learn</Label>
                          <Input
                            value={newEvent.skills_input}
                            onChange={(e) => setNewEvent({ ...newEvent, skills_input: e.target.value })}
                            placeholder="e.g., React, Python, UI/UX"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Festival/Campaign</Label>
                          <Input
                            value={newEvent.festival_campaign}
                            onChange={(e) => setNewEvent({ ...newEvent, festival_campaign: e.target.value })}
                            placeholder="Festival or campaign name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Website URL</Label>
                          <Input
                            value={newEvent.website_url}
                            onChange={(e) => setNewEvent({ ...newEvent, website_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Theme</Label>
                          <Input
                            value={newEvent.theme}
                            onChange={(e) => setNewEvent({ ...newEvent, theme: e.target.value })}
                            placeholder="e.g., Sustainability"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Participation Type</Label>
                          <Select
                            value={newEvent.participation_type}
                            onValueChange={(val) => setNewEvent({ ...newEvent, participation_type: val as "individual" | "team" })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="team">Team</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(newEvent.participation_type === "team" || newEvent.event_type === "hackathon") && (
                          <>
                            <div className="grid gap-2">
                              <Label>Min Team Size</Label>
                              <Input
                                type="number"
                                min="1"
                                value={newEvent.team_size_min_input}
                                onChange={(e) => setNewEvent({ ...newEvent, team_size_min_input: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Max Team Size</Label>
                              <Input
                                type="number"
                                min="1"
                                value={newEvent.team_size_max_input}
                                onChange={(e) => setNewEvent({ ...newEvent, team_size_max_input: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                        <div className="grid gap-2">
                          <Label>Who can register?</Label>
                          <Input
                            value={newEvent.who_can_register}
                            onChange={(e) => setNewEvent({ ...newEvent, who_can_register: e.target.value })}
                            placeholder="Everyone can apply"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>College/Organization</Label>
                          <Input
                            value={newEvent.college_organization}
                            onChange={(e) => setNewEvent({ ...newEvent, college_organization: e.target.value })}
                            placeholder="Everyone can apply"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Gender</Label>
                          <Input
                            value={newEvent.gender_criteria}
                            onChange={(e) => setNewEvent({ ...newEvent, gender_criteria: e.target.value })}
                            placeholder="Everyone can apply"
                          />
                        </div>
                        <EventMediaUpload
                          imageUrl={newEvent.image_url}
                          videoUrl={newEvent.video_url}
                          onImageChange={(url) => setNewEvent({ ...newEvent, image_url: url })}
                          onVideoChange={(url) => setNewEvent({ ...newEvent, video_url: url })}
                        />
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSharingEvent(event)}
                        >
                          <Share2 className="mr-1 h-4 w-4" />
                          Share
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditFormError(null);
                                setEditingEvent(normalizeEditableEvent(event));
                              }}
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                                  <Label>Full Description</Label>
                                  <Textarea
                                    value={editingEvent.full_description || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, full_description: e.target.value })}
                                    rows={4}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Event Type</Label>
                                  <Select
                                    value={editingEvent.event_type}
                                    onValueChange={(val) =>
                                      setEditingEvent({
                                        ...editingEvent,
                                        event_type: val,
                                        participation_type: val === "hackathon" ? "team" : editingEvent.participation_type,
                                      })
                                    }
                                  >
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
                                  <Label>Location</Label>
                                  <Input
                                    value={editingEvent.location || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Event Mode</Label>
                                  <Select
                                    value={editingEvent.mode || "offline"}
                                    onValueChange={(val) => setEditingEvent({ ...editingEvent, mode: val })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="offline">Offline</SelectItem>
                                      <SelectItem value="online">Online</SelectItem>
                                      <SelectItem value="hybrid">Hybrid</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(editingEvent.mode || "offline") !== "offline" && (
                                  <div className="grid gap-2">
                                    <Label>Online Link</Label>
                                    <Input
                                      value={editingEvent.online_link || ""}
                                      onChange={(e) => setEditingEvent({ ...editingEvent, online_link: e.target.value })}
                                    />
                                  </div>
                                )}
                                <div className="grid gap-2">
                                  <Label>Registration Deadline</Label>
                                  <Input
                                    type="datetime-local"
                                    value={editingEvent.registration_deadline || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, registration_deadline: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Tags</Label>
                                  <Input
                                    value={editingEvent.tags_input || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, tags_input: e.target.value })}
                                    placeholder="e.g., AI, Web, Design"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Skills or Tags to Learn</Label>
                                  <Input
                                    value={editingEvent.skills_input || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, skills_input: e.target.value })}
                                    placeholder="e.g., React, Python, UI/UX"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Festival/Campaign</Label>
                                  <Input
                                    value={editingEvent.festival_campaign || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, festival_campaign: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Website URL</Label>
                                  <Input
                                    value={editingEvent.website_url || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, website_url: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Theme</Label>
                                  <Input
                                    value={editingEvent.theme || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, theme: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Participation Type</Label>
                                  <Select
                                    value={editingEvent.participation_type || "individual"}
                                    onValueChange={(val) =>
                                      setEditingEvent({ ...editingEvent, participation_type: val as "individual" | "team" })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="individual">Individual</SelectItem>
                                      <SelectItem value="team">Team</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {((editingEvent.participation_type || "individual") === "team" || editingEvent.event_type === "hackathon") && (
                                  <>
                                    <div className="grid gap-2">
                                      <Label>Min Team Size</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={editingEvent.team_size_min_input || "1"}
                                        onChange={(e) => setEditingEvent({ ...editingEvent, team_size_min_input: e.target.value })}
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Max Team Size</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={editingEvent.team_size_max_input || "1"}
                                        onChange={(e) => setEditingEvent({ ...editingEvent, team_size_max_input: e.target.value })}
                                      />
                                    </div>
                                  </>
                                )}
                                <div className="grid gap-2">
                                  <Label>Who can register?</Label>
                                  <Input
                                    value={editingEvent.who_can_register || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, who_can_register: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>College/Organization</Label>
                                  <Input
                                    value={editingEvent.college_organization || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, college_organization: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Gender</Label>
                                  <Input
                                    value={editingEvent.gender_criteria || ""}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, gender_criteria: e.target.value })}
                                  />
                                </div>
                                <EventMediaUpload
                                  imageUrl={editingEvent.image_url}
                                  videoUrl={editingEvent.video_url}
                                  onImageChange={(url) => setEditingEvent({ ...editingEvent, image_url: url })}
                                  onVideoChange={(url) => setEditingEvent({ ...editingEvent, video_url: url })}
                                />
                                {editFormError && (
                                  <p className="text-sm text-destructive">{editFormError}</p>
                                )}
                              </div>
                            )}
                            <DialogFooter>
                              <Button onClick={handleUpdateEvent}>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Shield className="mr-1 h-4 w-4" />
                              Permissions
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Event Permissions</DialogTitle>
                              <DialogDescription>Manage access for this event</DialogDescription>
                            </DialogHeader>
                            <EventPermissionsManager eventId={event.id} eventTitle={event.title} />
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

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Define default permissions for college roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>College Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {collegeRoleOptions.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={async () => {
                        try {
                          await apiClient.updateRolePermissions(selectedRole, rolePermissionsDraft);
                          await fetchRolePermissions();
                          toast({ title: "Permissions saved", description: "Role permissions updated." });
                        } catch (error) {
                          toast({ title: "Error", description: "Failed to save permissions", variant: "destructive" });
                        }
                      }}
                      disabled={rolePermissionsLoading}
                    >
                      Save Role Permissions
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {permissionOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={rolePermissionsDraft.includes(option.id)}
                        onChange={(event) => {
                          const next = new Set(rolePermissionsDraft);
                          if (event.target.checked) {
                            next.add(option.id);
                          } else {
                            next.delete(option.id);
                          }
                          setRolePermissionsDraft(Array.from(next));
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Set default permissions for each college role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>College Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {collegeRoleOptions.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={async () => {
                        try {
                          await apiClient.updateRolePermissions(selectedRole, rolePermissionsDraft);
                          await fetchRolePermissions();
                          toast({ title: "Permissions saved", description: "Role permissions updated." });
                        } catch (error) {
                          toast({ title: "Error", description: "Failed to save permissions", variant: "destructive" });
                        }
                      }}
                      disabled={rolePermissionsLoading}
                    >
                      Save Role Permissions
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {permissionOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={rolePermissionsDraft.includes(option.id)}
                        onChange={(event) => {
                          const next = new Set(rolePermissionsDraft);
                          if (event.target.checked) {
                            next.add(option.id);
                          } else {
                            next.delete(option.id);
                          }
                          setRolePermissionsDraft(Array.from(next));
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Share Event Dialog */}
        {sharingEvent && (
          <EventShareDialog
            open={!!sharingEvent}
            onOpenChange={(open) => !open && setSharingEvent(null)}
            eventId={sharingEvent.id}
            eventTitle={sharingEvent.title}
            eventType={sharingEvent.event_type}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
