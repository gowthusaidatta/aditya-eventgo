import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Users, UserPlus, LogOut, Crown, X } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TeamManagementProps {
  eventId: string;
  teamSizeMin?: number;
  teamSizeMax?: number;
}

export function TeamManagement({ eventId, teamSizeMin = 1, teamSizeMax = 5 }: TeamManagementProps) {
  const { team, members, loading, isLeader, createTeam, joinTeamByCode, leaveTeam, removeMember } = useTeam(eventId);
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const copyInviteCode = () => {
    if (team?.invite_code) {
      navigator.clipboard.writeText(team.invite_code);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
      });
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setIsCreating(true);
    await createTeam(teamName.trim(), teamDescription.trim() || undefined);
    setIsCreating(false);
    setTeamName("");
    setTeamDescription("");
  };

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) return;
    setIsJoining(true);
    await joinTeamByCode(inviteCode.trim());
    setIsJoining(false);
    setInviteCode("");
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

  // No team yet - show create/join options
  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Registration
          </CardTitle>
          <CardDescription>
            Create a new team or join an existing one using an invite code.
            Team size: {teamSizeMin} - {teamSizeMax} members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create Team */}
          <div className="space-y-4">
            <h4 className="font-medium">Create a New Team</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                />
              </div>
              <div>
                <Label htmlFor="teamDescription">Description (optional)</Label>
                <Textarea
                  id="teamDescription"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Brief description of your team"
                  rows={2}
                />
              </div>
              <Button 
                onClick={handleCreateTeam} 
                disabled={isCreating || !teamName.trim()}
                className="w-full"
              >
                {isCreating ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-muted-foreground text-sm">
              OR
            </span>
          </div>

          {/* Join Team */}
          <div className="space-y-4">
            <h4 className="font-medium">Join an Existing Team</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                />
              </div>
              <Button 
                onClick={handleJoinTeam} 
                disabled={isJoining || inviteCode.length !== 8}
                variant="outline"
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isJoining ? "Joining..." : "Join Team"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has team - show team details
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {team.name}
            </CardTitle>
            {team.description && (
              <CardDescription className="mt-1">{team.description}</CardDescription>
            )}
          </div>
          <Badge variant={team.status === 'forming' ? 'outline' : 'default'}>
            {team.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite Code */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Invite Code</p>
            <p className="font-mono font-bold text-lg">{team.invite_code}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={copyInviteCode}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Team Members */}
        <div>
          <h4 className="font-medium mb-3">Team Members ({members.length}/{teamSizeMax})</h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {member.profile?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {member.profile?.full_name || "Unknown"}
                      {member.role === "leader" && (
                        <Crown className="h-3 w-3 text-primary" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                  </div>
                </div>
                {isLeader && member.role !== "leader" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.profile?.full_name} from the team?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeMember(member.user_id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave Team (for non-leaders) */}
        {!isLeader && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Leave Team
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave team?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave this team? You'll need a new invite code to rejoin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={leaveTeam}>Leave Team</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
