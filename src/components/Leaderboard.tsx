import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/integrations/api/apiClient";
import { Trophy, Medal, Award } from "lucide-react";

interface TeamScore {
  id?: string;
  team_id?: string;
  name: string;
  total_score: number;
  rank: number | null;
  current_round: string;
  status: string;
}

interface LeaderboardProps {
  eventId: string;
}

export function Leaderboard({ eventId }: LeaderboardProps) {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [eventId]);

  const fetchLeaderboard = async () => {
    try {
      const data = await apiClient.getTeams(eventId);
      const teamsData = Array.isArray(data) ? data : [];
      teamsData.sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0));
      setTeams(teamsData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="font-mono text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-primary/10 border-primary/30";
      case 2:
        return "bg-muted border-border";
      case 3:
        return "bg-accent/10 border-accent/30";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Leaderboard
        </CardTitle>
        <CardDescription>
          Real-time rankings based on judge scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No teams have been scored yet.
          </p>
        ) : (
          <div className="space-y-2">
            {teams.map((team, index) => (
              <div
                key={team.team_id || team.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getRankBg(index + 1)}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {team.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {team.current_round}
                      </Badge>
                      {team.status === 'winner' && (
                        <Badge className="text-xs bg-primary">Winner</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{team.total_score.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
