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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, BarChart3, PlusCircle, Eye, Edit, Trash2, UserCheck, UserX, AlertCircle, Share2, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/integrations/api/apiClient";
import { useToast } from "@/hooks/use-toast";
import { EventMediaUpload } from "@/components/EventMediaUpload";
import { EventShareDialog } from "@/components/EventShareDialog";
import { EventPermissionsManager } from "@/components/EventPermissionsManager";

interface Event {
  id: string;
  title: string;
  description: string | null;
  full_description?: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  video_url: string | null;
  is_featured: boolean | null;
  created_by: string | null;
  mode?: string | null;
  online_link?: string | null;
  registration_deadline?: string | null;
  is_hackathon?: boolean | null;
  team_size_min?: number | null;
  team_size_max?: number | null;
  tags?: string[];
  venue_details?: Record<string, unknown> | null;
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

interface CollegeUser {
  id?: string;
  user_id?: string;
  userId?: string;
  full_name: string;
  email: string;
  college_id: string | null;
  college_name: string | null;
  is_verified: boolean;
  college_role?: string | null;
}

export default function CollegeDashboard() {
  const { user, profile, collegeRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [collegeUsers, setCollegeUsers] = useState<CollegeUser[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditableEvent | null>(null);
  const [sharingEvent, setSharingEvent] = useState<Event | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});

  // New event form
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

  const rolePermissionDefaults: Record<string, string[]> = {
    principal: ["create_event", "edit_event", "delete_event", "manage_users", "manage_registrations", "grant_permissions", "full_access"],
    dean: ["create_event", "edit_event", "delete_event", "manage_users", "manage_registrations", "grant_permissions"],
    staff_coordinator: ["create_event", "manage_registrations"],
    student_coordinator: ["manage_registrations"],
    host: ["manage_registrations"],
  };

  const getEffectivePermissions = () => {
    if (!collegeRole) return [];
    const roleKey = `college:${collegeRole}`;
    const rolePerms = rolePermissions[roleKey] || rolePermissionDefaults[collegeRole] || [];
    const userPerms = Array.isArray(profile?.permissions) ? profile?.permissions : [];
    const merged = new Set([...rolePerms, ...userPerms]);
    if (merged.has("full_access")) {
      return [
        "create_event",
        "edit_event",
        "delete_event",
        "manage_users",
        "manage_registrations",
        "grant_permissions",
        "full_access",
      ];
    }
    return Array.from(merged);
  };

  const effectivePermissions = getEffectivePermissions();
  const canCreate = effectivePermissions.includes("create_event");
  const canEdit = effectivePermissions.includes("edit_event");
  const canDelete = effectivePermissions.includes("delete_event");
  const canViewReports = effectivePermissions.includes("manage_users");
  const canVerifyUsers = effectivePermissions.includes("manage_users");
  const isVerified = profile?.is_verified;

  const roleLabel: Record<string, string> = {
    principal: "Principal",
    dean: "Dean",
    staff_coordinator: "Staff Coordinator",
    student_coordinator: "Student Coordinator",
    host: "Event Host",
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

  const getVerificationNotice = () => {
    switch (collegeRole) {
      case "principal":
        return "Your account is awaiting verification by the administrator.";
      case "dean":
        return "Your account is awaiting verification by the principal or administrator.";
      case "staff_coordinator":
        return "Your account is awaiting verification by the dean, principal, or administrator.";
      case "student_coordinator":
        return "Your account is awaiting verification by the staff coordinator, dean, principal, or administrator.";
      default:
        return "Your account is awaiting verification by the administrator.";
    }
  };

  const canVerifyTargetRole = (targetRole: string | null | undefined) => {
    if (!collegeRole || !targetRole) return false;

    if (collegeRole === "principal") {
      return targetRole !== "principal";
    }

    if (collegeRole === "dean") {
      return ["staff_coordinator", "student_coordinator", "host"].includes(targetRole);
    }

    if (collegeRole === "staff_coordinator") {
      return ["student_coordinator"].includes(targetRole);
    }

    return false;
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
      }
      fetchRolePermissions();
    }
  }, [user, profile, loading, navigate, isVerified, canVerifyUsers]);

  const fetchRolePermissions = async () => {
    try {
      const items = await apiClient.getRolePermissions();
      const map: Record<string, string[]> = {};
      (Array.isArray(items) ? items : []).forEach((item) => {
        if (item?.role_id) {
          map[item.role_id] = Array.isArray(item.permissions) ? item.permissions : [];
        }
      });
      setRolePermissions(map);
    } catch (error) {
      console.error("Error loading role permissions:", error);
    }
  };

  const fetchEvents = async () => {
    const eventsData = await apiClient.getEvents({ createdBy: user?.id });
    const normalized = (Array.isArray(eventsData) ? eventsData : [])
      .map((event) => ({
        ...event,
        id: event.eventId || event.id,
        start_date: event.start_date || event.startDate,
      }))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    setEvents(normalized);

    const counts: Record<string, number> = {};
    await Promise.all(
      normalized.map(async (event) => {
        const countData = await apiClient.getRegistrationCount(event.id);
        counts[event.id] = countData?.count || 0;
      })
    );
    setRegistrationCounts(counts);
  };

  const fetchCollegeUsers = async () => {
    const data = await apiClient.listUsers({ userType: "college" });
    const users = Array.isArray(data) ? data : [];
    const normalized = users
      .map((u) => ({
        ...u,
        user_id: u.user_id || u.userId,
        userId: u.userId || u.user_id,
        id: u.id || u.userId || u.user_id,
      }))
      .filter((u) => u.userId !== user?.id);
    setCollegeUsers(normalized);
  };

  const getUserRole = (userId: string) => {
    const role = collegeUsers.find((u) => u.userId === userId)?.college_role;
    return role || null;
  };

  const handleVerifyUser = async (userId: string, verify: boolean, targetRole?: string | null) => {
    if (!canVerifyTargetRole(targetRole)) {
      toast({
        title: "Not allowed",
        description: "You do not have permission to verify this role.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiClient.updateUserProfile(userId, { is_verified: verify });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: verify ? "User Verified" : "Verification Removed",
      description: `User has been ${verify ? "verified" : "unverified"}.`,
    });
    fetchCollegeUsers();
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
      description: "New event has been created successfully.",
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
      description: "Event has been updated successfully.",
    });
    setEditFormError(null);
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
                {getVerificationNotice()} You will be able to access the dashboard once your account has been verified.
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
                  events.map((event) => {
                    const venueDetails = (event.venue_details || {}) as Record<string, unknown>;
                    const themeText =
                      typeof venueDetails.theme === "string" && venueDetails.theme
                        ? venueDetails.theme
                        : null;
                    const tagsText = Array.isArray(event.tags) && event.tags.length > 0
                      ? event.tags.join(", ")
                      : null;
                    const participationText = event.team_size_max && event.team_size_max > 1 ? "Team" : "Individual";
                    const modeText = event.mode || "Not provided";

                    return (
                      <div key={event.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{event.title}</p>
                            <Badge>{event.event_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.start_date).toLocaleDateString()} • {registrationCounts[event.id] || 0} registrations
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Mode: {modeText}</span>
                            <span>Participation: {participationText}</span>
                            <span>Theme: {themeText || "Not provided"}</span>
                            <span>Tags: {tagsText || "Not provided"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={new Date(event.start_date) > new Date() ? "default" : "secondary"}>
                            {new Date(event.start_date) > new Date() ? "Upcoming" : "Completed"}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => setSharingEvent(event)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {effectivePermissions.includes("grant_permissions") && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Shield className="h-4 w-4" />
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
                          )}
                          {canEdit && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditFormError(null);
                                    setEditingEvent(normalizeEditableEvent(event));
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
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
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
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
                      (() => {
                        const targetRole = getUserRole(u.user_id || u.userId) || null;
                        const canVerifyTarget = canVerifyTargetRole(targetRole);
                        return (
                      <div key={u.id || u.user_id || u.userId} className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{u.full_name}</p>
                            {targetRole && (
                              <Badge variant="outline">{roleLabel[targetRole as string] || targetRole}</Badge>
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
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canVerifyTarget}
                              onClick={() => handleVerifyUser(u.user_id || u.userId, false, targetRole)}
                            >
                              <UserX className="mr-1 h-4 w-4" />
                              Revoke
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!canVerifyTarget}
                              onClick={() => handleVerifyUser(u.user_id || u.userId, true, targetRole)}
                            >
                              <UserCheck className="mr-1 h-4 w-4" />
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                        );
                      })()
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
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
