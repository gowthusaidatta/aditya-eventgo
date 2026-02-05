import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Shield, Search } from "lucide-react";

interface EventPermission {
  id: string;
  user_id: string;
  permission_type: string;
  granted_by: string;
  granted_at: string;
  is_active: boolean;
  user?: {
    full_name: string;
    email: string;
    user_type: string;
  };
}

interface CollegeUser {
  user_id: string;
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
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPermission, setSelectedPermission] = useState<string>("view_registrations");

  useEffect(() => {
    fetchPermissions();
    fetchCollegeUsers();
  }, [eventId]);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("event_permissions")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true);

      if (error) throw error;

      // Fetch user details for each permission
      if (data && data.length > 0) {
        const userIds = data.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, user_type")
          .in("user_id", userIds);

        const enrichedPermissions = data.map(p => ({
          ...p,
          user: profiles?.find(profile => profile.user_id === p.user_id),
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
      // Fetch college users and their roles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, user_type")
        .eq("user_type", "college");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const usersWithRoles = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        role: roles?.find(r => r.user_id === p.user_id)?.role,
      }));

      setCollegeUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const grantPermission = async () => {
    if (!selectedUser || !user) return;

    try {
      const { error } = await supabase.from("event_permissions").insert({
        event_id: eventId,
        user_id: selectedUser,
        permission_type: selectedPermission,
        granted_by: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already granted",
            description: "This user already has this permission",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Permission granted",
        description: "User can now access this event",
      });

      setSelectedUser("");
      fetchPermissions();
    } catch (error) {
      console.error("Error granting permission:", error);
      toast({
        title: "Error",
        description: "Failed to grant permission",
        variant: "destructive",
      });
    }
  };

  const revokePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from("event_permissions")
        .update({ is_active: false })
        .eq("id", permissionId);

      if (error) throw error;

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
    switch (type) {
      case "view_registrations": return "View Registrations";
      case "edit_event": return "Edit Event";
      case "manage_event": return "Manage Event";
      case "full_access": return "Full Access";
      default: return type;
    }
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
                        selectedUser === u.user_id ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        setSelectedUser(u.user_id);
                        setSearchQuery(u.full_name);
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
                  <SelectItem value="view_registrations">View Registrations</SelectItem>
                  <SelectItem value="edit_event">Edit Event</SelectItem>
                  <SelectItem value="manage_event">Manage Event</SelectItem>
                  <SelectItem value="full_access">Full Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={grantPermission} disabled={!selectedUser}>
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
                  key={perm.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{perm.user?.full_name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{perm.user?.email}</div>
                    </div>
                    <Badge variant="outline">{getPermissionLabel(perm.permission_type)}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokePermission(perm.id)}
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
