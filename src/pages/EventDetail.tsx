import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EventRegistrationDialog } from "@/components/EventRegistrationDialog";
import { TeamManagement } from "@/components/TeamManagement";
import { EventShareDialog } from "@/components/EventShareDialog";
import { Leaderboard } from "@/components/Leaderboard";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Globe, 
  Trophy,
  Share2,
  ChevronLeft
} from "lucide-react";
import { format } from "date-fns";

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  max_participants: number | null;
  image_url: string | null;
  video_url: string | null;
  mode?: string;
  status?: string;
  registration_fee?: number;
  waitlist_enabled?: boolean;
  online_link?: string | null;
  is_hackathon?: boolean;
  team_size_min?: number;
  team_size_max?: number;
  prizes?: unknown;
  sponsors?: unknown;
  faqs?: unknown;
  tags?: string[];
}

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  speaker_name: string | null;
  day_number: number;
  session_type: string;
}

export default function EventDetail() {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [isRegDialogOpen, setIsRegDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    // Auto-open registration dialog from URL param
    if (searchParams.get("register") === "true") {
      setIsRegDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const fetchEventDetails = async () => {
    if (!eventId) return;

    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch schedule
      const { data: scheduleData } = await supabase
        .from("event_schedule")
        .select("*")
        .eq("event_id", eventId)
        .order("day_number")
        .order("start_time");

      setSchedule(scheduleData || []);

      // Fetch registration count
      const { count } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      setRegistrationCount(count || 0);

      // Check if user is registered
      if (user) {
        const { data: regData } = await supabase
          .from("event_registrations")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .single();

        setIsRegistered(!!regData);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 text-center">
          <h1 className="text-2xl font-bold">Event Not Found</h1>
          <Button className="mt-4" onClick={() => navigate("/events")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const spotsLeft = event.max_participants ? event.max_participants - registrationCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-secondary/20">
        {event.image_url ? (
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-24 w-24 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <main className="container -mt-20 relative z-10 pb-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">{event.event_type}</Badge>
                  <Badge variant="outline">{event.mode}</Badge>
                  {event.is_hackathon && <Badge className="bg-primary">Hackathon</Badge>}
                  {event.status !== "published" && (
                    <Badge variant="destructive">{event.status}</Badge>
                  )}
                </div>
                <CardTitle className="text-3xl">{event.title}</CardTitle>
                {event.description && (
                  <CardDescription className="text-base mt-2">{event.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(event.start_date), "EEEE, MMMM d, yyyy")}
                      </p>
                      {event.end_date && (
                        <p className="text-sm text-muted-foreground">
                          to {format(new Date(event.end_date), "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <p className="font-medium">
                      {format(new Date(event.start_date), "h:mm a")}
                    </p>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <p className="font-medium">{event.location}</p>
                    </div>
                  )}
                  {event.mode !== "offline" && event.online_link && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <a href={event.online_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Join Online
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            {schedule.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {schedule.map((session) => (
                      <div key={session.id} className="flex gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground min-w-[80px]">
                          {format(new Date(session.start_time), "h:mm a")}
                        </div>
                        <div>
                          <p className="font-medium">{session.title}</p>
                          {session.speaker_name && (
                            <p className="text-sm text-muted-foreground">by {session.speaker_name}</p>
                          )}
                          {session.description && (
                            <p className="text-sm mt-1">{session.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hackathon-specific content */}
            {event.is_hackathon && (
              <Tabs defaultValue="team" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="team">My Team</TabsTrigger>
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                  <TabsTrigger value="prizes">Prizes</TabsTrigger>
                </TabsList>
                <TabsContent value="team">
                  <TeamManagement 
                    eventId={event.id} 
                    teamSizeMin={event.team_size_min}
                    teamSizeMax={event.team_size_max}
                  />
                </TabsContent>
                <TabsContent value="leaderboard">
                  <Leaderboard eventId={event.id} />
                </TabsContent>
                <TabsContent value="prizes">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Prizes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(event.prizes) && event.prizes.length > 0 ? (
                        <div className="space-y-4">
                          {(event.prizes as Array<{ position: string; amount?: number }>).map((prize, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <span className="font-medium">{prize.position}</span>
                              <span className="text-primary font-bold">₹{prize.amount?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Prize details coming soon...</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {/* FAQs */}
            {Array.isArray(event.faqs) && event.faqs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>FAQs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(event.faqs as Array<{ question: string; answer: string }>).map((faq, index: number) => (
                    <div key={index}>
                      <h4 className="font-medium">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>
                  {spotsLeft !== null ? (
                    <span className={spotsLeft <= 10 ? "text-destructive" : ""}>
                      {spotsLeft} spots remaining
                    </span>
                  ) : (
                    `${registrationCount} registered`
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(event.registration_fee ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Registration Fee</span>
                    <span className="text-2xl font-bold">₹{event.registration_fee}</span>
                  </div>
                )}

                {isRegistered ? (
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="font-medium text-primary">✓ You're registered!</p>
                  </div>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    disabled={isFull}
                    onClick={() => setIsRegDialogOpen(true)}
                  >
                    {isFull ? "Event Full" : "Register Now"}
                  </Button>
                )}

                <Separator />

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>
              </CardContent>
            </Card>

            {/* Sponsors */}
            {Array.isArray(event.sponsors) && event.sponsors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sponsors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {(event.sponsors as Array<{ name: string; logo_url?: string }>).map((sponsor, index: number) => (
                      <div key={index} className="text-center">
                        {sponsor.logo_url ? (
                          <img src={sponsor.logo_url} alt={sponsor.name} className="h-12 object-contain" />
                        ) : (
                          <p className="font-medium">{sponsor.name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Registration Dialog */}
      <EventRegistrationDialog
        event={event}
        open={isRegDialogOpen}
        onOpenChange={setIsRegDialogOpen}
      />

      {/* Share Dialog */}
      <EventShareDialog
        eventId={event.id}
        eventTitle={event.title}
        eventType={event.event_type}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </div>
  );
}
