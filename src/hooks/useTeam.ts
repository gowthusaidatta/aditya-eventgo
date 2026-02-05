import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
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
  id: string;
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
      // First check if user is part of any team for this event
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        const teamIds = memberData.map((m) => m.team_id);
        
        // Get teams for this event
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("*")
          .eq("event_id", eventId)
          .in("id", teamIds)
          .single();

        if (teamError && teamError.code !== "PGRST116") throw teamError;

        if (teamData) {
          setTeam(teamData);
          setIsLeader(teamData.leader_id === user.id);

          // Fetch team members
          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select("*")
            .eq("team_id", teamData.id);

          if (membersError) throw membersError;
          
          // Fetch profiles for each member
          if (membersData && membersData.length > 0) {
            const userIds = membersData.map((m) => m.user_id);
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("user_id, full_name, email, avatar_url")
              .in("user_id", userIds);

            const membersWithProfiles = membersData.map((m) => ({
              ...m,
              profile: profilesData?.find((p) => p.user_id === m.user_id) || {
                full_name: "Unknown",
                email: "",
                avatar_url: null,
              },
            }));
            setMembers(membersWithProfiles);
          } else {
            setMembers([]);
          }
        }
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
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          event_id: eventId,
          name,
          description,
          leader_id: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add leader as team member
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: "leader",
        });

      if (memberError) throw memberError;

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
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", inviteCode.toUpperCase())
        .eq("event_id", eventId)
        .single();

      if (teamError) {
        toast({
          title: "Invalid invite code",
          description: "No team found with that invite code for this event.",
          variant: "destructive",
        });
        return false;
      }

      // Check team size
      const { data: membersCount, error: countError } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", teamData.id);

      if (countError) throw countError;
      
      // Basic team size check
      if (membersCount && membersCount.length >= 10) {
        toast({
          title: "Team is full",
          description: "This team has reached its maximum capacity.",
          variant: "destructive",
        });
        return false;
      }
      
      // Add user to team
      const { error: joinError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: "member",
        });

      if (joinError) {
        if (joinError.code === "23505") {
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
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", team.id)
        .eq("user_id", user.id);

      if (error) throw error;

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
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

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
