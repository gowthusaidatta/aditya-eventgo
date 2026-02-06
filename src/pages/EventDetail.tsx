import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/integrations/api/apiClient";
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
  eventId: string;
  title: string;
  description: string | null;
  event_type?: string;
  category?: string;
  startDate?: string;
  start_date?: string;
  end_date?: string | null;
  location: string | null;
  max_participants?: number | null;
  capacity?: number | null;
  image_url?: string | null;
  bannerUrl?: string | null;
  video_url?: string | null;
  mode?: string | null;
  status?: string | null;
  registration_deadline?: string | null;
  registration_fee?: number;
  waitlist_enabled?: boolean;
  online_link?: string | null;
  is_hackathon?: boolean;
  team_size_min?: number;
  team_size_max?: number;
  prizes?: unknown;
  sponsors?: unknown;
  faqs?: unknown;
  tags?: string[] | null;
  venue_details?: Record<string, unknown> | null;
  organizer?: {
    userId?: string;
    name?: string;
    email?: string;
  };
  schedule?: Schedule[];
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
  const [organizerName, setOrganizerName] = useState<string | null>(null);

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
      const eventData = await apiClient.getEvent(eventId);
      setEvent(eventData);

      setOrganizerName(eventData?.organizer?.name || null);
      setSchedule(eventData?.schedule || []);

      const countData = await apiClient.getRegistrationCount(eventId);
      setRegistrationCount(countData?.count || 0);

      if (user) {
        const regData = await apiClient.getRegistrations(eventId);
        setIsRegistered(Array.isArray(regData) && regData.length > 0);
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

  const capacity = event.max_participants || event.capacity || null;
  const spotsLeft = capacity ? capacity - registrationCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isRegistrationClosed = event.registration_deadline
    ? new Date(event.registration_deadline) < new Date()
    : false;

  const venueDetails = (event.venue_details || {}) as Record<string, unknown>;
  const festivalCampaign =
    (typeof venueDetails.festival === "string" && venueDetails.festival) ||
    (typeof venueDetails.campaign === "string" && venueDetails.campaign) ||
    (typeof venueDetails.festival_campaign === "string" && venueDetails.festival_campaign) ||
    null;
  const companyWebsite =
    (typeof venueDetails.website === "string" && venueDetails.website) || event.online_link || null;
  const participationType = event.team_size_max && event.team_size_max > 1 ? "Team" : "Individual";
  const skillsText = event.tags && event.tags.length > 0 ? event.tags.join(", ") : "Not provided";
  const themeText = event.tags && event.tags.length > 0 ? event.tags.join(", ") : "Not provided";
  const registrationDeadlineText = event.registration_deadline
    ? format(new Date(event.registration_deadline), "EEEE, MMMM d, yyyy")
    : "Not provided";

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-secondary/20">
        {(event.image_url || event.bannerUrl) ? (
          <img 
            src={event.image_url || event.bannerUrl} 
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
                  <Badge variant="secondary">{event.event_type || event.category || "event"}</Badge>
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
                        {format(new Date(event.startDate || event.start_date || ""), "EEEE, MMMM d, yyyy")}
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
                      {format(new Date(event.startDate || event.start_date || ""), "h:mm a")}
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

            <Card>
              <CardHeader>
                <CardTitle>Opportunity Details</CardTitle>
                <CardDescription>Key information about this opportunity</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Logo</p>
                  {(event.image_url || event.bannerUrl) ? (
                    <img
                      src={event.image_url || event.bannerUrl}
                      alt={`${event.title} logo`}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Supported logo image JPG, JPEG, or PNG. Max 1 MB
                  </p>
                  <p className="text-xs text-destructive">Logo required</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Opportunity Title</p>
                  <p className="text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground">Max 190 characters</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Organisation Name</p>
                  <p className="text-sm">{organizerName || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Opportunity Type</p>
                  <p className="text-sm">{event.event_type || event.category || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Opportunity Category</p>
                  <p className="text-sm">{skillsText}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Link Festival/Campaign</p>
                  <p className="text-sm">{festivalCampaign || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Company Website URL</p>
                  {companyWebsite ? (
                    <a
                      href={companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {companyWebsite}
                    </a>
                  ) : (
                    <p className="text-sm">Not provided</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Event Theme</p>
                  <p className="text-sm">{themeText}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About the Opportunity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Opportunity Description</p>
                <p className="mt-2 text-sm">
                  {event.description || "No description provided."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills to be assessed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  List required skills to attract participants with matching abilities or engage individuals eager to improve them
                </p>
                <p className="mt-2 text-sm">{skillsText}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Opportunity Mode & Participation Type</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Participation Type</p>
                  <p className="text-sm">{participationType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Set team size</p>
                  <p className="text-sm">Min: {event.team_size_min ?? 1}</p>
                  <p className="text-sm">Max: {event.team_size_max ?? event.team_size_min ?? 1}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Mode of Opportunity</p>
                  <p className="text-sm">{event.mode || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Registration Deadline</p>
                  <p className="text-sm">{registrationDeadlineText}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registration Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Who can register?</p>
                  <p className="text-sm text-muted-foreground">Everyone can apply</p>
                </div>
                <div>
                  <p className="text-sm font-medium">College/Organization</p>
                  <p className="text-sm text-muted-foreground">Default: Everyone can apply</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Gender</p>
                  <p className="text-sm text-muted-foreground">Default: Everyone can apply</p>
                </div>
              </CardContent>
            </Card>

            {((event.image_url || event.bannerUrl) || event.video_url) && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Media</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {(event.image_url || event.bannerUrl) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Photo</p>
                      <img
                        src={event.image_url || event.bannerUrl}
                        alt={`${event.title} cover`}
                        className="w-full rounded-lg object-cover"
                      />
                    </div>
                  )}
                  {event.video_url && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Video</p>
                      {getYouTubeEmbedUrl(event.video_url) ? (
                        <iframe
                          className="h-56 w-full rounded-lg"
                          src={getYouTubeEmbedUrl(event.video_url) as string}
                          title={`${event.title} video`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video className="w-full rounded-lg" controls src={event.video_url} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                    eventId={event.eventId} 
                    teamSizeMin={event.team_size_min}
                    teamSizeMax={event.team_size_max}
                  />
                </TabsContent>
                <TabsContent value="leaderboard">
                  <Leaderboard eventId={event.eventId} />
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
                      disabled={isFull || isRegistrationClosed}
                      onClick={() => setIsRegDialogOpen(true)}
                    >
                      {isRegistrationClosed ? "Registration Closed" : isFull ? "Event Full" : "Register Now"}
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
        eventId={event.eventId}
        eventTitle={event.title}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </div>
  );
}
