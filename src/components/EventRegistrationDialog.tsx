import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  
  const [regForm, setRegForm] = useState({
    full_name: "",
    roll_number: "",
    college_name: "",
    branch: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (profile) {
      setRegForm({
        full_name: profile.full_name || "",
        roll_number: profile.roll_number || "",
        college_name: profile.college_name || "",
        branch: profile.branch || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
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

    if (!regForm.full_name || !regForm.roll_number || !regForm.college_name || !regForm.branch) {
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
        full_name: regForm.full_name,
        roll_number: regForm.roll_number,
        college_name: regForm.college_name,
        branch: regForm.branch,
        email: regForm.email,
        phone: regForm.phone,
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
      <DialogContent className="max-w-md">
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
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input
                  value={regForm.full_name}
                  onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Roll Number *</Label>
                <Input
                  value={regForm.roll_number}
                  onChange={(e) => setRegForm({ ...regForm, roll_number: e.target.value })}
                  placeholder="Enter your roll number"
                />
              </div>
              <div className="grid gap-2">
                <Label>College Name *</Label>
                <Input
                  value={regForm.college_name}
                  onChange={(e) => setRegForm({ ...regForm, college_name: e.target.value })}
                  placeholder="Enter your college name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Branch *</Label>
                <Input
                  value={regForm.branch}
                  onChange={(e) => setRegForm({ ...regForm, branch: e.target.value })}
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone (Optional)</Label>
                <Input
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
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
