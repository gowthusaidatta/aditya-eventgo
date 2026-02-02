import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { useState } from "react";

// Mock data
const allEvents = [
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
  {
    id: "5",
    title: "Annual Cultural Fest",
    description: "Celebrate culture with music, dance, and art performances.",
    event_type: "fest",
    location: "Open Air Theatre",
    start_date: "2026-05-10",
    max_participants: 2000,
    image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600",
  },
  {
    id: "6",
    title: "Entrepreneurship Seminar",
    description: "Learn from successful entrepreneurs about starting your own business.",
    event_type: "seminar",
    location: "Business School Auditorium",
    start_date: "2026-03-05",
    max_participants: 150,
    image_url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600",
  },
];

const eventTypeColors: Record<string, string> = {
  conference: "bg-primary/10 text-primary",
  hackathon: "bg-secondary/10 text-secondary",
  workshop: "bg-accent/10 text-accent",
  fair: "bg-muted text-muted-foreground",
  fest: "bg-primary/10 text-primary",
  seminar: "bg-secondary/10 text-secondary",
};

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredEvents = allEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || event.event_type === typeFilter;
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
              <SelectItem value="hackathon">Hackathon</SelectItem>
              <SelectItem value="fest">Fest</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden transition-shadow hover:shadow-lg">
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
                <Button className="w-full">Register Now</Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No events found matching your criteria.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
