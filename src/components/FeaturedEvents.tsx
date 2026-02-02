import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

// Mock data for now - will be replaced with real data
const featuredEvents = [
  {
    id: "1",
    title: "Tech Innovation Summit 2026",
    description: "Join industry leaders for a day of innovation and networking.",
    event_type: "conference",
    location: "Aditya University Campus",
    start_date: "2026-03-15",
    max_participants: 500,
    image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600",
  },
  {
    id: "2",
    title: "Hackathon 2026",
    description: "48 hours of coding, creativity, and competition.",
    event_type: "hackathon",
    location: "Virtual Event",
    start_date: "2026-04-01",
    max_participants: 200,
    image_url: "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=600",
  },
  {
    id: "3",
    title: "Career Fair Spring 2026",
    description: "Meet top recruiters and explore job opportunities.",
    event_type: "fair",
    location: "Main Auditorium",
    start_date: "2026-03-25",
    max_participants: 1000,
    image_url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600",
  },
  {
    id: "4",
    title: "Workshop: AI & Machine Learning",
    description: "Hands-on workshop on building ML models.",
    event_type: "workshop",
    location: "Computer Lab 3",
    start_date: "2026-02-20",
    max_participants: 50,
    image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600",
  },
];

const eventTypeColors: Record<string, string> = {
  conference: "bg-primary/10 text-primary",
  hackathon: "bg-secondary/10 text-secondary",
  workshop: "bg-accent/10 text-accent",
  fair: "bg-muted text-muted-foreground",
};

export function FeaturedEvents() {
  const navigate = useNavigate();

  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Featured Events</h2>
            <p className="mt-2 text-muted-foreground">Discover upcoming events from colleges and organizations</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/events")}>
            View All
          </Button>
        </div>

        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-4">
            {featuredEvents.map((event) => (
              <CarouselItem key={event.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className={eventTypeColors[event.event_type] || "bg-muted"}>
                        {event.event_type}
                      </Badge>
                    </div>
                    <h3 className="line-clamp-1 text-lg font-semibold">{event.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(event.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{event.max_participants} spots</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => navigate(`/events/${event.id}`)}>
                      Learn More
                    </Button>
                  </CardFooter>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
}
