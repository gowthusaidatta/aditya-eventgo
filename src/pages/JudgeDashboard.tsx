import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/integrations/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardCheck, 
  Star, 
  ExternalLink,
  Save
} from "lucide-react";

interface Submission {
  id?: string;
  submission_id?: string;
  event_id?: string;
  team_id?: string;
  title: string;
  description: string | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  round: string;
  status: string;
  team: {
    name: string;
  };
}

interface Rubric {
  id: string;
  rubric_id?: string;
  criteria_name: string;
  description: string | null;
  max_score: number;
  weight: number;
}

export default function JudgeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [scores, setScores] = useState<Record<string, { score: number; feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignedEvents, setAssignedEvents] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchAssignedEvents();
    }
  }, [user, authLoading, navigate]);

  const fetchAssignedEvents = async () => {
    if (!user) return;

    const roles = await apiClient.getPlatformRoles({ role: "judge" });
    const eventIds = (Array.isArray(roles) ? roles : [])
      .filter((r) => r.is_active !== false)
      .map((r) => r.event_id)
      .filter(Boolean) as string[];
    setAssignedEvents(eventIds);

    if (eventIds.length > 0) {
      fetchSubmissions(eventIds);
    } else {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (eventIds: string[]) => {
    const submissionsArrays = await Promise.all(
      eventIds.map((eventId) => apiClient.getSubmissions({ eventId }))
    );
    const teamArrays = await Promise.all(eventIds.map((eventId) => apiClient.getTeams(eventId)));

    const teamsById = new Map<string, any>();
    teamArrays.flat().forEach((team: any) => {
      if (team?.team_id) teamsById.set(team.team_id, team);
    });

    const submissions = submissionsArrays
      .flat()
      .filter((sub: any) => sub.status === "submitted")
      .map((sub: any) => ({
        ...sub,
        id: sub.submission_id || sub.id,
        team: { name: teamsById.get(sub.team_id)?.name || "Unknown" },
      }))
      .sort((a, b) => new Date(a.submitted_at || a.updated_at || 0).getTime() - new Date(b.submitted_at || b.updated_at || 0).getTime());

    setSubmissions(submissions);
    if (submissions.length > 0) {
      setSelectedSubmission(submissions[0]);
      fetchRubricsAndScores(submissions[0]);
    }
    setLoading(false);
  };

  const fetchRubricsAndScores = async (submission: Submission) => {
    if (!user) return;

    const eventId = submission.event_id;
    if (!eventId) return;

    const [rubricsData, existingScores] = await Promise.all([
      apiClient.getRubrics(eventId),
      apiClient.getJudgingScores(submission.submission_id || submission.id || ""),
    ]);

    const normalizedRubrics = (Array.isArray(rubricsData) ? rubricsData : []).map(
      (rubric: Rubric) => ({
        ...rubric,
        id: rubric.id || rubric.rubric_id || "",
      })
    );
    setRubrics(normalizedRubrics);

    const scoresMap: Record<string, { score: number; feedback: string }> = {};
    (Array.isArray(existingScores) ? existingScores : [])
      .filter((score: any) => score.judge_id === user.id)
      .forEach((score: any) => {
        const rubricId = score.rubric_id || score.id;
        if (!rubricId) return;
        scoresMap[rubricId] = { score: score.score, feedback: score.feedback || "" };
      });
    setScores(scoresMap);
  };

  const handleSelectSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setScores({});
    fetchRubricsAndScores(submission);
  };

  const handleScoreChange = (rubricId: string, score: number) => {
    setScores((prev) => ({
      ...prev,
      [rubricId]: { ...prev[rubricId], score, feedback: prev[rubricId]?.feedback || "" },
    }));
  };

  const handleFeedbackChange = (rubricId: string, feedback: string) => {
    setScores((prev) => ({
      ...prev,
      [rubricId]: { ...prev[rubricId], score: prev[rubricId]?.score || 0, feedback },
    }));
  };

  const handleSave = async () => {
    if (!user || !selectedSubmission) return;

    setSaving(true);
    try {
      const submissionId = selectedSubmission.submission_id || selectedSubmission.id;
      for (const rubric of rubrics) {
        const scoreData = scores[rubric.id];
        if (scoreData) {
          await apiClient.saveJudgingScore({
            submission_id: submissionId,
            rubric_id: rubric.id,
            score: scoreData.score,
            feedback: scoreData.feedback || null,
            event_id: selectedSubmission.event_id,
            team_id: selectedSubmission.team_id,
          });
        }
      }

      toast({
        title: "Scores saved",
        description: "Your evaluation has been saved successfully.",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error saving scores",
        description: err.message || "Failed to save scores",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalScore = () => {
    let totalWeighted = 0;
    let totalWeight = 0;
    
    rubrics.forEach((rubric) => {
      const score = scores[rubric.id]?.score || 0;
      totalWeighted += (score / rubric.max_score) * rubric.weight * 100;
      totalWeight += rubric.weight;
    });

    return totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(1) : "0";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (assignedEvents.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 text-center">
          <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Assignments</h1>
          <p className="text-muted-foreground">
            You haven't been assigned as a judge for any events yet.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Judge Dashboard
          </h1>
          <p className="text-muted-foreground">Evaluate submissions and provide scores</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Submissions List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>{submissions.length} pending review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {submissions.map((sub) => (
                <Button
                  key={sub.id}
                  variant={selectedSubmission?.id === sub.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleSelectSubmission(sub)}
                >
                  <div className="text-left">
                    <p className="font-medium truncate">{sub.title}</p>
                    <p className="text-xs text-muted-foreground">{sub.team?.name}</p>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Judging Panel */}
          <Card className="lg:col-span-2">
            {selectedSubmission ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedSubmission.title}</CardTitle>
                      <CardDescription>Team: {selectedSubmission.team?.name}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-lg">
                      <Star className="h-4 w-4 mr-1 text-primary" />
                      {calculateTotalScore()}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Links */}
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.github_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedSubmission.github_url} target="_blank" rel="noopener noreferrer">
                          GitHub <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {selectedSubmission.demo_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedSubmission.demo_url} target="_blank" rel="noopener noreferrer">
                          Demo <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {selectedSubmission.video_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedSubmission.video_url} target="_blank" rel="noopener noreferrer">
                          Video <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {selectedSubmission.description && (
                    <p className="text-sm text-muted-foreground">{selectedSubmission.description}</p>
                  )}

                  {/* Rubrics */}
                  <div className="space-y-6">
                    {rubrics.map((rubric) => (
                      <div key={rubric.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{rubric.criteria_name}</h4>
                            {rubric.description && (
                              <p className="text-sm text-muted-foreground">{rubric.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary">
                            {scores[rubric.id]?.score || 0} / {rubric.max_score}
                          </Badge>
                        </div>
                        <Slider
                          value={[scores[rubric.id]?.score || 0]}
                          onValueChange={([value]) => handleScoreChange(rubric.id, value)}
                          max={rubric.max_score}
                          step={1}
                        />
                        <Textarea
                          placeholder="Feedback (optional)"
                          value={scores[rubric.id]?.feedback || ""}
                          onChange={(e) => handleFeedbackChange(rubric.id, e.target.value)}
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Evaluation"}
                  </Button>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a submission to review</p>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
