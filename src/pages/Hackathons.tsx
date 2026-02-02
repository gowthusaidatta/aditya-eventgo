import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Search, Code } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  max_participants: number | null;
  image_url: string | null;
}

export default function Hackathons() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [hackathons, setHackathons] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registering, setRegistering] = useState(false);
  
  // Registration form state
  const [regForm, setRegForm] = useState({
    full_name: "",
    roll_number: "",
    college_name: "",
    branch: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchHackathons();
  }, []);

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

  const fetchHackathons = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("event_type", "hackathon")
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Error fetching hackathons:", error);
    } else {
      setHackathons(data || []);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!user || !selectedEvent) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to register for hackathons.",
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
    
    const { error } = await supabase.from("hackathon_registrations").insert({
      event_id: selectedEvent.id,
      user_id: user.id,
      full_name: regForm.full_name,
      roll_number: regForm.roll_number,
      college_name: regForm.college_name,
      branch: regForm.branch,
      email: regForm.email,
      phone: regForm.phone,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Already registered",
          description: "You have already registered for this hackathon.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to register. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Registered successfully!",
        description: `You're registered for ${selectedEvent.title}.`,
      });
      setSelectedEvent(null);
    }
    setRegistering(false);
  };

  const filteredHackathons = hackathons.filter(h =>
    h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Hackathons</h1>
          <p className="mt-2 text-muted-foreground">
            Participate in exciting hackathons and showcase your skills
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search hackathons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Hackathons Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredHackathons.length === 0 ? (
          <div className="py-12 text-center">
            <Code className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No hackathons found</h3>
            <p className="text-muted-foreground">Check back later for upcoming hackathons.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredHackathons.map((hackathon) => (
              <Card key={hackathon.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Code className="h-16 w-16 text-primary/50" />
                </div>
                <CardHeader className="pb-2">
                  <Badge className="w-fit bg-primary/10 text-primary">Hackathon</Badge>
                  <h3 className="text-lg font-semibold">{hackathon.title}</h3>
                </CardHeader>
                <CardContent className="space-y-2 pb-2">
                  {hackathon.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{hackathon.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(hackathon.start_date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                  {hackathon.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{hackathon.location}</span>
                    </div>
                  )}
                  {hackathon.max_participants && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Max {hackathon.max_participants} participants</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedEvent(hackathon)}>
                        Register Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Register for {hackathon.title}</DialogTitle>
                        <DialogDescription>
                          Fill in your details to register for this hackathon.
                        </DialogDescription>
                      </DialogHeader>
                      {!user ? (
                        <div className="py-4 text-center">
                          <p className="text-muted-foreground">Please log in to register for hackathons.</p>
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
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
