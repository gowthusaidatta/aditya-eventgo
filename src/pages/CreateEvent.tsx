import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Trophy, Users, Building2, Clock, MapPin } from "lucide-react";

interface ScheduleItem {
  id: string;
  day_number: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  session_type: string;
  speaker_name: string;
}

interface Prize {
  id: string;
  position: string;
  amount: string;
  description: string;
}

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  tier: string;
  website: string;
}

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("workshop");
  const [isHackathon, setIsHackathon] = useState(false);
  const [mode, setMode] = useState<"online" | "offline" | "hybrid">("offline");
  const [location, setLocation] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [registrationFee, setRegistrationFee] = useState("0");
  const [teamSizeMin, setTeamSizeMin] = useState("1");
  const [teamSizeMax, setTeamSizeMax] = useState("5");

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [numDays, setNumDays] = useState(1);

  // Prizes
  const [prizes, setPrizes] = useState<Prize[]>([
    { id: "1", position: "1st Place", amount: "", description: "" },
    { id: "2", position: "2nd Place", amount: "", description: "" },
    { id: "3", position: "3rd Place", amount: "", description: "" },
  ]);

  // Sponsors
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const addScheduleItem = (day: number) => {
    setSchedule([
      ...schedule,
      {
        id: crypto.randomUUID(),
        day_number: day,
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        session_type: "session",
        speaker_name: "",
      },
    ]);
  };

  const updateScheduleItem = (id: string, field: keyof ScheduleItem, value: string | number) => {
    setSchedule(schedule.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeScheduleItem = (id: string) => {
    setSchedule(schedule.filter(item => item.id !== id));
  };

  const addPrize = () => {
    setPrizes([
      ...prizes,
      { id: crypto.randomUUID(), position: "", amount: "", description: "" },
    ]);
  };

  const updatePrize = (id: string, field: keyof Prize, value: string) => {
    setPrizes(prizes.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePrize = (id: string) => {
    setPrizes(prizes.filter(p => p.id !== id));
  };

  const addSponsor = () => {
    setSponsors([
      ...sponsors,
      { id: crypto.randomUUID(), name: "", logo_url: "", tier: "silver", website: "" },
    ]);
  };

  const updateSponsor = (id: string, field: keyof Sponsor, value: string) => {
    setSponsors(sponsors.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSponsor = (id: string) => {
    setSponsors(sponsors.filter(s => s.id !== id));
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    if (!title || !startDate) {
      toast({ title: "Error", description: "Title and start date are required", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Create event
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          title,
          description,
          event_type: eventType,
          is_hackathon: isHackathon,
          mode,
          location: mode !== "online" ? location : null,
          online_link: mode !== "offline" ? onlineLink : null,
          start_date: new Date(startDate).toISOString(),
          end_date: endDate ? new Date(endDate).toISOString() : null,
          registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          registration_fee: parseFloat(registrationFee) || 0,
          team_size_min: isHackathon ? parseInt(teamSizeMin) : 1,
          team_size_max: isHackathon ? parseInt(teamSizeMax) : 1,
          prizes: prizes.filter(p => p.position && p.amount).map(({ id, ...p }) => p),
          sponsors: sponsors.filter(s => s.name).map(({ id, ...s }) => s),
          status,
          created_by: user.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create schedule items
      if (schedule.length > 0 && event) {
        const scheduleItems = schedule
          .filter(s => s.title && s.start_time)
          .map(({ id, ...s }) => ({
            ...s,
            event_id: event.id,
            start_time: new Date(`${startDate}T${s.start_time}`).toISOString(),
            end_time: s.end_time ? new Date(`${startDate}T${s.end_time}`).toISOString() : null,
          }));

        if (scheduleItems.length > 0) {
          const { error: scheduleError } = await supabase
            .from("event_schedule")
            .insert(scheduleItems);

          if (scheduleError) console.error("Schedule error:", scheduleError);
        }
      }

      toast({
        title: status === "published" ? "Event Published!" : "Draft Saved",
        description: status === "published" 
          ? "Your event is now live" 
          : "You can continue editing later",
      });

      navigate("/organizer-dashboard");
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Event</h1>
          <p className="text-muted-foreground">Set up your event or hackathon</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">
              <Calendar className="h-4 w-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="prizes">
              <Trophy className="h-4 w-4 mr-2" />
              Prizes
            </TabsTrigger>
            <TabsTrigger value="sponsors">
              <Building2 className="h-4 w-4 mr-2" />
              Sponsors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>Basic information about your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter event title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Event Type</Label>
                    <Select value={eventType} onValueChange={setEventType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="hackathon">Hackathon</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your event..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <Switch
                    id="hackathon"
                    checked={isHackathon}
                    onCheckedChange={setIsHackathon}
                  />
                  <Label htmlFor="hackathon">This is a hackathon (enables team features)</Label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Event Mode</Label>
                    <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {mode !== "online" && (
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Venue address"
                      />
                    </div>
                  )}
                  {mode !== "offline" && (
                    <div className="space-y-2">
                      <Label htmlFor="link">Online Link</Label>
                      <Input
                        id="link"
                        value={onlineLink}
                        onChange={(e) => setOnlineLink(e.target.value)}
                        placeholder="Meeting URL"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Date & Time *</Label>
                    <Input
                      id="start"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Date & Time</Label>
                    <Input
                      id="end"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Registration Deadline</Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={registrationDeadline}
                      onChange={(e) => setRegistrationDeadline(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="max">Max Participants</Label>
                    <Input
                      id="max"
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee">Registration Fee (₹)</Label>
                    <Input
                      id="fee"
                      type="number"
                      value={registrationFee}
                      onChange={(e) => setRegistrationFee(e.target.value)}
                      placeholder="0 for free"
                    />
                  </div>
                </div>

                {isHackathon && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="minTeam">Min Team Size</Label>
                      <Input
                        id="minTeam"
                        type="number"
                        value={teamSizeMin}
                        onChange={(e) => setTeamSizeMin(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxTeam">Max Team Size</Label>
                      <Input
                        id="maxTeam"
                        type="number"
                        value={teamSizeMax}
                        onChange={(e) => setTeamSizeMax(e.target.value)}
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Event Schedule</CardTitle>
                    <CardDescription>Build your multi-day agenda</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Days:</Label>
                    <Select value={numDays.toString()} onValueChange={(v) => setNumDays(parseInt(v))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Array.from({ length: numDays }, (_, i) => i + 1).map(day => (
                  <div key={day} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Day {day}</h3>
                      <Button variant="outline" size="sm" onClick={() => addScheduleItem(day)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Session
                      </Button>
                    </div>
                    
                    {schedule.filter(s => s.day_number === day).map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScheduleItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Session Title</Label>
                            <Input
                              value={item.title}
                              onChange={(e) => updateScheduleItem(item.id, "title", e.target.value)}
                              placeholder="Session name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={item.session_type}
                              onValueChange={(v) => updateScheduleItem(item.id, "session_type", v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="session">Session</SelectItem>
                                <SelectItem value="keynote">Keynote</SelectItem>
                                <SelectItem value="workshop">Workshop</SelectItem>
                                <SelectItem value="break">Break</SelectItem>
                                <SelectItem value="networking">Networking</SelectItem>
                                <SelectItem value="panel">Panel Discussion</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={item.start_time}
                              onChange={(e) => updateScheduleItem(item.id, "start_time", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={item.end_time}
                              onChange={(e) => updateScheduleItem(item.id, "end_time", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                              value={item.location}
                              onChange={(e) => updateScheduleItem(item.id, "location", e.target.value)}
                              placeholder="Room/Hall"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Speaker Name</Label>
                            <Input
                              value={item.speaker_name}
                              onChange={(e) => updateScheduleItem(item.id, "speaker_name", e.target.value)}
                              placeholder="Speaker name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateScheduleItem(item.id, "description", e.target.value)}
                              placeholder="Brief description"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {schedule.filter(s => s.day_number === day).length === 0 && (
                      <p className="text-center text-muted-foreground py-4 border rounded-lg">
                        No sessions added for Day {day}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prizes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Prizes & Rewards</CardTitle>
                    <CardDescription>Configure prize pool for winners</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addPrize}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Prize
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {prizes.map((prize, index) => (
                  <div key={prize.id} className="border rounded-lg p-4">
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePrize(prize.id)}
                        disabled={prizes.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Input
                          value={prize.position}
                          onChange={(e) => updatePrize(prize.id, "position", e.target.value)}
                          placeholder="e.g., 1st Place"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          value={prize.amount}
                          onChange={(e) => updatePrize(prize.id, "amount", e.target.value)}
                          placeholder="Prize amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={prize.description}
                          onChange={(e) => updatePrize(prize.id, "description", e.target.value)}
                          placeholder="Additional perks"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sponsors">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sponsors</CardTitle>
                    <CardDescription>Add your event sponsors</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSponsor}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sponsor
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sponsors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No sponsors added yet. Click "Add Sponsor" to get started.
                  </p>
                ) : (
                  sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="border rounded-lg p-4">
                      <div className="flex justify-end mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSponsor(sponsor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label>Sponsor Name</Label>
                          <Input
                            value={sponsor.name}
                            onChange={(e) => updateSponsor(sponsor.id, "name", e.target.value)}
                            placeholder="Company name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Logo URL</Label>
                          <Input
                            value={sponsor.logo_url}
                            onChange={(e) => updateSponsor(sponsor.id, "logo_url", e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tier</Label>
                          <Select
                            value={sponsor.tier}
                            onValueChange={(v) => updateSponsor(sponsor.id, "tier", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="platinum">Platinum</SelectItem>
                              <SelectItem value="gold">Gold</SelectItem>
                              <SelectItem value="silver">Silver</SelectItem>
                              <SelectItem value="bronze">Bronze</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Website</Label>
                          <Input
                            value={sponsor.website}
                            onChange={(e) => updateSponsor(sponsor.id, "website", e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleSubmit("draft")} disabled={loading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit("published")} disabled={loading}>
            {loading ? "Creating..." : "Publish Event"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
