import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, Search, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EventRegistrationDialog } from "@/components/EventRegistrationDialog";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [hackathons, setHackathons] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchHackathons();
  }, []);

  // Handle ?register=eventId URL parameter
  useEffect(() => {
    const registerId = searchParams.get("register");
    if (registerId && hackathons.length > 0) {
      const hackathonToRegister = hackathons.find(h => h.id === registerId);
      if (hackathonToRegister) {
        setSelectedEvent(hackathonToRegister);
        setIsDialogOpen(true);
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, hackathons, setSearchParams]);

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

  const handleOpenRegistration = (hackathon: Event) => {
    setSelectedEvent(hackathon);
    setIsDialogOpen(true);
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
                {hackathon.image_url ? (
                  <img 
                    src={hackathon.image_url} 
                    alt={hackathon.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Code className="h-16 w-16 text-primary/50" />
                  </div>
                )}
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
                  <Button className="w-full" onClick={() => handleOpenRegistration(hackathon)}>
                    Register Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Registration Dialog */}
      <EventRegistrationDialog
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
