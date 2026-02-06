import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { apiClient } from "@/integrations/api/apiClient";

interface Event {
  eventId: string;
  title: string;
  description: string | null;
  event_type?: string;
  category?: string;
  startDate?: string;
  start_date?: string;
  location: string | null;
  image_url?: string | null;
  bannerUrl?: string | null;
  is_featured?: boolean | null;
  registration_deadline?: string | null;
}

export function FeaturedEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedEvents();
  }, []);

  const fetchFeaturedEvents = async () => {
    try {
      const data = await apiClient.getEvents();
      const now = new Date();
      const featured = (data || []).filter((event: Event) => event.is_featured);
      const fallback = featured.length > 0 ? featured : data || [];
      const upcoming = fallback
        .filter((event: Event) => {
          if (!event.registration_deadline) return true;
          return new Date(event.registration_deadline) >= now;
        })
        .slice(0, 3);
      setEvents(upcoming);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section className="bg-background py-16 md:py-24">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Featured Events</h2>
              <p className="mt-1 text-sm text-muted-foreground">Discover trending events from top colleges</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="bg-background py-16 md:py-24">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Featured Events</h2>
              <p className="mt-1 text-sm text-muted-foreground">Discover trending events from top colleges</p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/events")} className="gap-1 text-primary hover:text-primary">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            No events available yet. Check back soon!
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Featured Events</h2>
            <p className="mt-1 text-sm text-muted-foreground">Discover trending events from top colleges</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/events")} className="gap-1 text-primary hover:text-primary">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card
              key={event.eventId}
              className="group cursor-pointer overflow-hidden border-border/50 transition-all hover:shadow-lg"
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
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {(event.image_url || event.bannerUrl) ? (
                  <img
                    src={event.image_url || event.bannerUrl}
                    alt={event.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <Calendar className="h-16 w-16 text-primary/50" />
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="mb-2 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs capitalize">
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
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{new Date(event.startDate || event.start_date || "").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{event.location}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    navigate(`/event/${event.eventId}`);
                  }}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
