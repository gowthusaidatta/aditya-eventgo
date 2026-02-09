import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/integrations/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Shield, Search } from "lucide-react";

interface EventPermission {
  user_id: string;
  role: string;
  allowedActions?: string[];
  granted_by?: string;
  granted_at?: string;
  user?: {
    full_name: string;
    email: string;
    user_type: string;
  };
}

interface CollegeUser {
  user_id: string;
  userId?: string;
  full_name: string;
  email: string;
  role?: string;
}

interface EventPermissionsManagerProps {
  eventId: string;
  eventTitle: string;
}

export function EventPermissionsManager({ eventId, eventTitle }: EventPermissionsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<EventPermission[]>([]);
  const [collegeUsers, setCollegeUsers] = useState<CollegeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermission, setSelectedPermission] = useState<string>("manage_registrations");

  const permissionOptions = [
    {
      value: "manage_registrations",
      label: "Manage Registrations",
      actions: ["registrations:read", "registrations:update"],
    },
    {
      value: "edit_event",
      label: "Edit Event",
      actions: ["events:update"],
    },
    {
      value: "delete_event",
      label: "Delete Event",
      actions: ["events:delete"],
    },
    {
      value: "grant_permissions",
      label: "Grant Permissions",
      actions: ["permissions:read", "permissions:grant", "permissions:revoke"],
    },
    {
      value: "full_access",
      label: "Full Access",
      actions: ["events:update", "events:delete", "registrations:read", "registrations:update", "teams:read", "teams:update"],
    },
  ];

  useEffect(() => {
    fetchPermissions();
    fetchCollegeUsers();
  }, [eventId]);

  const fetchPermissions = async () => {
    try {
      const data = await apiClient.request("GET", `/events/${eventId}/permissions`);
      const items = Array.isArray(data) ? data : [];

      if (items.length > 0) {
        const profiles = await apiClient.listUsers({ userType: "college" });
        const profileList = Array.isArray(profiles) ? profiles : [];

        const enrichedPermissions = items.map(p => ({
          ...p,
          id: p.user_id,
          user: profileList.find(profile => (profile.user_id || profile.userId) === p.user_id),
        }));

        setPermissions(enrichedPermissions);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollegeUsers = async () => {
    try {
      const profiles = await apiClient.listUsers({ userType: "college" });
      const usersWithRoles = (Array.isArray(profiles) ? profiles : []).map(p => ({
        user_id: p.user_id || p.userId,
        userId: p.userId || p.user_id,
        full_name: p.full_name,
        email: p.email,
        role: p.college_role || p.role,
      }));

      setCollegeUsers(usersWithRoles.filter((u) => u.user_id));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const grantPermission = async () => {
    if (!selectedUserId || !user) return;

    try {
      const selectedPolicy = permissionOptions.find((opt) => opt.value === selectedPermission);
      await apiClient.request("POST", `/events/${eventId}/permissions`, {
        user_id: selectedUserId,
        email: selectedEmail,
        role: selectedPermission,
        allowedActions: selectedPolicy?.actions || [],
      });

      toast({
        title: "Permission granted",
        description: "User can now access this event",
      });

      setSelectedEmail("");
      setSelectedUserId("");
      fetchPermissions();
    } catch (error: any) {
      if (error?.response?.status === 409) {
        toast({
          title: "Already granted",
          description: "This user already has this permission",
          variant: "destructive",
        });
        return;
      }
      console.error("Error granting permission:", error);
      toast({
        title: "Error",
        description: "Failed to grant permission",
        variant: "destructive",
      });
    }
  };

  const revokePermission = async (userId: string, email?: string) => {
    try {
      await apiClient.request(
        "DELETE",
        `/events/${eventId}/permissions/${userId}`,
        undefined,
        {
          params: { user_id: userId, email },
        }
      );

      toast({
        title: "Permission revoked",
        description: "User access has been removed",
      });

      fetchPermissions();
    } catch (error) {
      console.error("Error revoking permission:", error);
      toast({
        title: "Error",
        description: "Failed to revoke permission",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = collegeUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPermissionLabel = (type: string) => {
    const match = permissionOptions.find((opt) => opt.value === type);
    return match ? match.label : type;
  };

  if (loading) {
    return <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <div>
            <CardTitle>Event Permissions</CardTitle>
            <CardDescription>Manage who can access this event: {eventTitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grant Permission */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="font-medium">Grant New Permission</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Select User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchQuery && filteredUsers.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {filteredUsers.slice(0, 5).map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                        selectedEmail === u.email ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                          setSelectedEmail(u.email);
                          setSelectedUserId(u.user_id || "");
                          setSearchQuery(u.email);
                      }}
                    >
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email} • {u.role || "No role"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Permission Type</Label>
              <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {permissionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
                <Button onClick={grantPermission} disabled={!selectedUserId}>
                <Plus className="h-4 w-4 mr-2" />
                Grant
              </Button>
            </div>
          </div>
        </div>

        {/* Current Permissions */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Current Permissions ({permissions.length})
          </h4>
          {permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No special permissions granted. Only the event creator and admins can access.
            </p>
          ) : (
            <div className="space-y-2">
              {permissions.map((perm) => (
                <div
                  key={perm.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{perm.user?.full_name || perm.user_id || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{perm.user?.email || perm.user_id}</div>
                    </div>
                    <Badge variant="outline">{getPermissionLabel(perm.role)}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokePermission(perm.user_id, perm.user?.email)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
