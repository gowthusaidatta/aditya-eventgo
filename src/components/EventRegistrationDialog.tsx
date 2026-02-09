import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/integrations/api/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Event {
  eventId: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date?: string;
  startDate?: string;
  location: string | null;
}

interface RegistrationField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

interface EventRegistrationDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrationSuccess?: (eventId: string) => void;
}

export function EventRegistrationDialog({ event, open, onOpenChange, onRegistrationSuccess }: EventRegistrationDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [registering, setRegistering] = useState(false);
  const [schemaFields, setSchemaFields] = useState<RegistrationField[]>([]);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});

  const updateTeamMembers = (members: string[]) => {
    setFormData({ ...formData, team_members: members });
  };

  useEffect(() => {
    const loadSchema = async () => {
      if (!event?.eventId || !open) return;
      setLoadingSchema(true);
      try {
        const schemaData = await apiClient.getEventSchema(event.eventId);
        const fields = Array.isArray(schemaData?.registration_schema)
          ? schemaData.registration_schema
          : [];
        setSchemaFields(fields);
        if (fields.some((field) => field.key === "team_members")) {
          setFormData((prev) => ({
            ...prev,
            team_members: Array.isArray(prev.team_members) ? prev.team_members : [""],
          }));
        }
      } catch (error) {
        console.error("Failed to load registration schema:", error);
        setSchemaFields([]);
      } finally {
        setLoadingSchema(false);
      }
    };

    loadSchema();
  }, [event?.eventId, open]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      full_name: profile.full_name || prev.full_name || "",
      roll_number: profile.roll_number || prev.roll_number || "",
      college_name: profile.college_name || prev.college_name || "",
      branch: profile.branch || prev.branch || "",
      email: profile.email || prev.email || "",
      phone: profile.phone || prev.phone || "",
    }));
  }, [profile]);

  const handleRegister = async () => {
    if (!user || !event) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to register for events.",
        variant: "destructive",
      });
      return;
    }

    const missingRequired = schemaFields
      .filter((field) => field.required)
      .filter((field) => {
        const value = formData[field.key];
        if (Array.isArray(value)) return value.length === 0;
        return !value || String(value).trim() === "";
      });

    if (missingRequired.length > 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setRegistering(true);
    
    try {
      await apiClient.registerForEvent(event.eventId, {
        form_data: formData,
        event_type: event.event_type,
        event_title: event.title,
        event_date: event.startDate || event.start_date,
        event_location: event.location,
      });
    } catch (error: any) {
      if (error?.response?.status === 409) {
        toast({
          title: "Already registered",
          description: "You have already registered for this event.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to register. Please try again.",
          variant: "destructive",
        });
      }
      setRegistering(false);
      return;
    }

    toast({
      title: "Registered successfully!",
      description: `You're registered for ${event.title}. A confirmation email has been sent.`,
    });
    
    // Call the success callback if provided
    if (onRegistrationSuccess) {
      onRegistrationSuccess(event.eventId);
    }
    
    onOpenChange(false);
    setRegistering(false);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {event.title}</DialogTitle>
          <DialogDescription>
            Fill in your details to register for this {event.event_type}.
          </DialogDescription>
        </DialogHeader>
        {!user ? (
          <div className="py-4 text-center">
            <p className="text-muted-foreground">Please log in to register for events.</p>
            <Button className="mt-4" onClick={() => window.location.href = "/login"}>
              Log In
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              {loadingSchema ? (
                <p className="text-sm text-muted-foreground">Loading form...</p>
              ) : (
                schemaFields.map((field) => (
                  <div className="grid gap-2" key={field.key}>
                    <Label>{field.label}{field.required ? " *" : ""}</Label>
                    {field.type === "team_members" ? (
                      <div className="grid gap-2">
                        {(Array.isArray(formData.team_members) ? formData.team_members : []).map((member, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={member}
                              onChange={(e) => {
                                const current = Array.isArray(formData.team_members)
                                  ? [...formData.team_members]
                                  : [];
                                current[index] = e.target.value;
                                updateTeamMembers(current);
                              }}
                              placeholder="member@example.com"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const current = Array.isArray(formData.team_members)
                                  ? [...formData.team_members]
                                  : [];
                                current.splice(index, 1);
                                updateTeamMembers(current.length ? current : [""]); 
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const current = Array.isArray(formData.team_members)
                              ? [...formData.team_members]
                              : [];
                            updateTeamMembers([...current, ""]);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </div>
                    ) : field.type === "select" && field.options ? (
                      <Select
                        value={String(formData[field.key] || "")}
                        onValueChange={(value) => setFormData({ ...formData, [field.key]: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.label} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "multiselect" && field.options ? (
                      <div className="grid gap-2">
                        <Input
                          value={searchFilters[field.key] || ""}
                          onChange={(e) =>
                            setSearchFilters({
                              ...searchFilters,
                              [field.key]: e.target.value,
                            })
                          }
                          placeholder={`Search ${field.label}`}
                        />
                        {Array.isArray(formData[field.key]) && formData[field.key].length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {(formData[field.key] as string[]).map((item) => (
                              <Badge key={item} variant="secondary">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {field.options.map((option) => {
                          const current = Array.isArray(formData[field.key]) ? formData[field.key] : [];
                          const checked = current.includes(option);
                          const filter = (searchFilters[field.key] || "").toLowerCase();
                          if (filter && !option.toLowerCase().includes(filter)) {
                            return null;
                          }
                          return (
                            <label key={option} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  const next = value
                                    ? [...current, option]
                                    : current.filter((item) => item !== option);
                                  setFormData({ ...formData, [field.key]: next });
                                }}
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    ) : field.type === "textarea" ? (
                      <Textarea
                        value={String(formData[field.key] || "")}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={field.label}
                        rows={3}
                      />
                    ) : (
                      <Input
                        type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
                        value={String(formData[field.key] || "")}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={field.label}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleRegister} disabled={registering}>
                {registering ? "Registering..." : "Submit Registration"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
