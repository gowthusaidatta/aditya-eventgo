import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { apiClient } from "@/integrations/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { EventRegistrationDialog } from "@/components/EventRegistrationDialog";

interface Event {
  eventId: string;
  title: string;
  description: string | null;
  event_type?: string;
  category?: string;
  startDate?: string;
  start_date?: string;
  location: string | null;
  capacity?: number | null;
  max_participants?: number | null;
  image_url?: string | null;
  bannerUrl?: string | null;
  registration_deadline?: string | null;
}

const eventTypeColors: Record<string, string> = {
  conference: "bg-primary/10 text-primary",
  hackathon: "bg-secondary text-secondary-foreground",
  workshop: "bg-accent text-accent-foreground",
  fair: "bg-muted text-muted-foreground",
  fest: "bg-primary/10 text-primary",
  seminar: "bg-secondary text-secondary-foreground",
  competition: "bg-accent text-accent-foreground",
};

export default function Events() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Fetch user's registrations
    if (user) {
      fetchUserRegistrations();
    }
  }, [user]);

  // Handle ?register=eventId URL parameter
  useEffect(() => {
    const registerId = searchParams.get("register");
    if (registerId && events.length > 0) {
      const eventToRegister = events.find(e => e.id === registerId);
      if (eventToRegister) {
        setSelectedEvent(eventToRegister);
        setIsDialogOpen(true);
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, events, setSearchParams]);

  const fetchUserRegistrations = async () => {
    if (!user) return;

    try {
      const data = await apiClient.getRegistrations();
      setRegisteredEventIds(new Set(data.map((reg: any) => reg.event_id)));
    } catch (error) {
      console.error("Error fetching registrations:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await apiClient.getEvents();
      const now = new Date();
      const upcoming = (data || []).filter((event: Event) => {
        if (!event.registration_deadline) return true;
        return new Date(event.registration_deadline) >= now;
      });
      setEvents(upcoming);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
    setLoading(false);
  };

  const handleOpenRegistration = (event: Event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleRegistrationSuccess = (eventId: string) => {
    // Add event to registered set
    setRegisteredEventIds(new Set([...registeredEventIds, eventId]));
    setIsDialogOpen(false);
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const typeValue = event.event_type || event.category || "";
    const matchesType = typeFilter === "all" || typeValue === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Explore Events</h1>
          <p className="mt-2 text-muted-foreground">Discover workshops, seminars, fests, and more</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="seminar">Seminar</SelectItem>
              <SelectItem value="conference">Conference</SelectItem>
              <SelectItem value="fest">Fest</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="competition">Competition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No events found</h3>
            <p className="text-muted-foreground">Check back later for upcoming events.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Card
                key={event.eventId}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/event/${event.eventId}`)}
                onKeyDown={(eventKey) => {
                  if (eventKey.key === "Enter" || eventKey.key === " ") {
                    eventKey.preventDefault();
                    navigate(`/event/${event.eventId}`);
                  }
                }}
              >
                {(event.image_url || event.bannerUrl) ? (
                  <img 
                    src={event.image_url || event.bannerUrl} 
                    alt={event.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Calendar className="h-16 w-16 text-primary/50" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={eventTypeColors[event.event_type || ""] || "bg-muted"}>
                      {event.event_type || event.category || "event"}
                    </Badge>
                  </div>
                  <h3 className="line-clamp-1 text-lg font-semibold">{event.title}</h3>
                  {event.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 pb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(event.startDate || event.start_date || "").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {(event.max_participants || event.capacity) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{event.max_participants || event.capacity} spots</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {registeredEventIds.has(event.eventId) ? (
                    <Button className="w-full" variant="outline" disabled>
                      ✓ Registered
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        handleOpenRegistration(event);
                      }}
                    >
                      Register Now
                    </Button>
                  )}
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
        onRegistrationSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}
