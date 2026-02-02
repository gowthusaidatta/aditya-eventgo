import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Mock data for now - will be replaced with real data
const featuredEvents = [
  {
    id: "1",
    title: "TechFest 2026 - Annual Technical Festival",
    description: "Join the biggest tech fest with coding competitions, robotics, and more.",
    event_type: "Tech",
    tags: ["Tech", "Coding"],
    location: "Mumbai",
    start_date: "2026-02-15",
    image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600",
    is_live: true,
  },
  {
    id: "2",
    title: "Innovate 2026 - Startup Summit",
    description: "Connect with investors, pitch your ideas, and learn from entrepreneurs.",
    event_type: "Startup",
    tags: ["Startup", "Innovation"],
    location: "Bangalore",
    start_date: "2026-03-01",
    image_url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600",
    is_live: false,
  },
  {
    id: "3",
    title: "Cultural Night - Euphoria 2026",
    description: "Experience music, dance, drama, and art at the biggest cultural extravaganza.",
    event_type: "Cultural",
    tags: ["Cultural", "Music"],
    location: "Delhi",
    start_date: "2026-02-22",
    image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600",
    is_live: false,
  },
];

export function FeaturedEvents() {
  const navigate = useNavigate();

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
          {featuredEvents.map((event) => (
            <Card key={event.id} className="group overflow-hidden border-border/50 transition-all hover:shadow-lg">
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {event.is_live && (
                  <Badge className="absolute right-3 top-3 bg-destructive">
                    Live
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="mb-2 flex flex-wrap gap-1">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h3 className="line-clamp-1 text-lg font-semibold">{event.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
              </CardHeader>
              <CardContent className="space-y-2 pb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{new Date(event.start_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{event.location}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => navigate(`/events/${event.id}`)}>
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
