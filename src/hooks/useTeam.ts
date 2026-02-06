import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/integrations/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Team {
  team_id: string;
  event_id: string;
  name: string;
  description: string | null;
  leader_id: string;
  invite_code: string;
  status: string;
  problem_statement_id: string | null;
  mentor_id: string | null;
  current_round: string;
  total_score: number;
  rank: number | null;
  created_at: string;
}

interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export function useTeam(eventId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!user || !eventId) {
      setLoading(false);
      return;
    }

    try {
      const teams = await apiClient.getTeams(eventId);
      if (!Array.isArray(teams) || teams.length === 0) {
        setTeam(null);
        setMembers([]);
        setIsLeader(false);
        return;
      }

      for (const candidate of teams) {
        const membersData = await apiClient.getTeamMembers(candidate.team_id);
        const isMember = membersData.some((m: TeamMember) => m.user_id === user.id);
        if (!isMember) continue;

        const userIds = membersData.map((m: TeamMember) => m.user_id);
        const profiles = userIds.length > 0 ? await apiClient.getUsersByIds(userIds) : [];
        const membersWithProfiles = membersData.map((m: TeamMember) => ({
          ...m,
          profile: profiles.find((p: any) => p.userId === m.user_id) || {
            full_name: "Unknown",
            email: "",
            avatar_url: null,
          },
        }));

        setTeam(candidate);
        setIsLeader(candidate.leader_id === user.id);
        setMembers(membersWithProfiles);
        return;
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  }, [user, eventId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const createTeam = async (name: string, description?: string) => {
    if (!user || !eventId) return null;

    try {
      const teamData = await apiClient.createTeam({
        event_id: eventId,
        name,
        description,
      });

      toast({
        title: "Team created!",
        description: `Your team "${name}" has been created. Share the invite code with teammates.`,
      });

      await fetchTeam();
      return teamData;
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error creating team",
        description: err.message || "Failed to create team",
        variant: "destructive",
      });
      return null;
    }
  };

  const joinTeamByCode = async (inviteCode: string) => {
    if (!user || !eventId) return false;

    try {
      // Find team by invite code
      const teamResults = await apiClient.getTeamByInviteCode(eventId, inviteCode);
      const teamData = Array.isArray(teamResults) ? teamResults[0] : null;
      if (!teamData) {
        toast({
          title: "Invalid invite code",
          description: "No team found with that invite code for this event.",
          variant: "destructive",
        });
        return false;
      }

      const membersCount = await apiClient.getTeamMembers(teamData.team_id);
      // Basic team size check
      if (membersCount && membersCount.length >= 10) {
        toast({
          title: "Team is full",
          description: "This team has reached its maximum capacity.",
          variant: "destructive",
        });
        return false;
      }
      
      try {
        await apiClient.addTeamMember(teamData.team_id, {
          user_id: user.id,
          role: "member",
        });
      } catch (joinError: any) {
        if (joinError?.response?.status === 409) {
          toast({
            title: "Already a member",
            description: "You're already a member of this team.",
            variant: "destructive",
          });
        } else {
          throw joinError;
        }
        return false;
      }

      toast({
        title: "Joined team!",
        description: `You've joined "${teamData.name}".`,
      });

      await fetchTeam();
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error joining team",
        description: err.message || "Failed to join team",
        variant: "destructive",
      });
      return false;
    }
  };

  const leaveTeam = async () => {
    if (!user || !team) return false;

    if (isLeader) {
      toast({
        title: "Cannot leave",
        description: "Team leaders must transfer leadership or disband the team.",
        variant: "destructive",
      });
      return false;
    }

    try {
      await apiClient.removeTeamMember(team.team_id, user.id);

      toast({
        title: "Left team",
        description: "You've left the team.",
      });

      setTeam(null);
      setMembers([]);
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error leaving team",
        description: err.message || "Failed to leave team",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isLeader || !team) return false;

    try {
      await apiClient.removeTeamMember(team.team_id, memberId);

      toast({
        title: "Member removed",
        description: "Team member has been removed.",
      });

      await fetchTeam();
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error removing member",
        description: err.message || "Failed to remove member",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    team,
    members,
    loading,
    isLeader,
    createTeam,
    joinTeamByCode,
    leaveTeam,
    removeMember,
    refresh: fetchTeam,
  };
}
