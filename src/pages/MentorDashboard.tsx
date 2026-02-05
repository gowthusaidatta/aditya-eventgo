import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageSquare, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface AssignedTeam {
  id: string;
  name: string;
  description: string | null;
  status: string;
  current_round: string;
  total_score: number;
  event: {
    id: string;
    title: string;
  };
  members: {
    user_id: string;
    profile: {
      full_name: string;
      email: string;
    } | null;
  }[];
}

interface MentorNote {
  id: string;
  team_id: string;
  note: string;
  created_at: string;
}

export default function MentorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teams, setTeams] = useState<AssignedTeam[]>([]);
  const [notes, setNotes] = useState<Record<string, MentorNote[]>>({});
  const [newNote, setNewNote] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchAssignedTeams();
    }
  }, [user, authLoading, navigate]);

  const fetchAssignedTeams = async () => {
    if (!user) return;

    try {
      // Fetch teams where this user is the mentor
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          description,
          status,
          current_round,
          total_score,
          event_id
        `)
        .eq("mentor_id", user.id);

      if (teamsError) throw teamsError;

      if (!teamsData || teamsData.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      // Fetch event details for each team
      const eventIds = [...new Set(teamsData.map(t => t.event_id))];
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title")
        .in("id", eventIds);

      // Fetch team members
      const teamIds = teamsData.map(t => t.id);
      const { data: membersData } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .in("team_id", teamIds);

      // Fetch profiles for members
      const memberUserIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", memberUserIds);

      // Combine data
      const enrichedTeams: AssignedTeam[] = teamsData.map(team => ({
        ...team,
        event: eventsData?.find(e => e.id === team.event_id) || { id: team.event_id, title: "Unknown Event" },
        members: (membersData?.filter(m => m.team_id === team.id) || []).map(m => ({
          user_id: m.user_id,
          profile: profilesData?.find(p => p.user_id === m.user_id) || null,
        })),
      }));

      setTeams(enrichedTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to load assigned teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "forming": return "secondary";
      case "complete": return "default";
      case "competing": return "default";
      case "winner": return "default";
      case "disqualified": return "destructive";
      default: return "outline";
    }
  };

  const getRoundLabel = (round: string) => {
    switch (round) {
      case "idea": return "Idea Round";
      case "prototype": return "Prototype Round";
      case "semifinal": return "Semi-Final";
      case "final": return "Final Round";
      default: return round;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mentor Dashboard</h1>
          <p className="text-muted-foreground">Guide and support your assigned teams</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Assigned Teams</CardDescription>
              <CardTitle className="text-3xl">{teams.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Idea Phase</CardDescription>
              <CardTitle className="text-3xl">
                {teams.filter(t => t.current_round === "idea").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Finals</CardDescription>
              <CardTitle className="text-3xl">
                {teams.filter(t => t.current_round === "final").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Need Attention</CardDescription>
              <CardTitle className="text-3xl">
                {teams.filter(t => t.status === "forming").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No teams assigned yet</h3>
              <p className="text-muted-foreground">
                You'll see teams here once an organizer assigns you as their mentor
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Teams ({teams.length})</TabsTrigger>
              <TabsTrigger value="active">
                Active ({teams.filter(t => t.status === "competing").length})
              </TabsTrigger>
              <TabsTrigger value="forming">
                Forming ({teams.filter(t => t.status === "forming").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <TeamList teams={teams} />
            </TabsContent>
            <TabsContent value="active">
              <TeamList teams={teams.filter(t => t.status === "competing")} />
            </TabsContent>
            <TabsContent value="forming">
              <TeamList teams={teams.filter(t => t.status === "forming")} />
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
}

function TeamList({ teams }: { teams: AssignedTeam[] }) {
  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No teams in this category
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}

function TeamCard({ team }: { team: AssignedTeam }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "forming": return "secondary";
      case "complete": return "default";
      case "competing": return "default";
      case "winner": return "default";
      case "disqualified": return "destructive";
      default: return "outline";
    }
  };

  const getRoundLabel = (round: string) => {
    switch (round) {
      case "idea": return "Idea Round";
      case "prototype": return "Prototype Round";
      case "semifinal": return "Semi-Final";
      case "final": return "Final Round";
      default: return round;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{team.name}</CardTitle>
            <CardDescription>{team.event.title}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={getStatusColor(team.status)}>{team.status}</Badge>
            <Badge variant="outline">{getRoundLabel(team.current_round)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {team.description && (
          <p className="text-sm text-muted-foreground">{team.description}</p>
        )}
        
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members ({team.members.length})
          </h4>
          <div className="space-y-1">
            {team.members.slice(0, expanded ? undefined : 3).map((member) => (
              <div key={member.user_id} className="text-sm flex items-center justify-between">
                <span>{member.profile?.full_name || "Unknown"}</span>
                <span className="text-muted-foreground text-xs">{member.profile?.email}</span>
              </div>
            ))}
            {team.members.length > 3 && !expanded && (
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setExpanded(true)}>
                +{team.members.length - 3} more
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Score: </span>
            <span className="font-medium">{team.total_score || 0}</span>
          </div>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Team
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
