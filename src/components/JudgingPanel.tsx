import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Star, Save, ExternalLink } from "lucide-react";

interface Rubric {
  id: string;
  criteria_name: string;
  description: string | null;
  max_score: number;
  weight: number;
}

interface Submission {
  id: string;
  title: string;
  description: string | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  team: {
    name: string;
  };
}

interface JudgingPanelProps {
  eventId: string;
  submissionId: string;
}

export function JudgingPanel({ eventId, submissionId }: JudgingPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [scores, setScores] = useState<Record<string, { score: number; feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId, submissionId]);

  const fetchData = async () => {
    try {
      // Fetch submission details
      const { data: submissionData, error: submissionError } = await supabase
        .from("submissions")
        .select(`
          *,
          team:teams(name)
        `)
        .eq("id", submissionId)
        .single();

      if (submissionError) throw submissionError;
      setSubmission(submissionData);

      // Fetch rubrics for this event
      const { data: rubricsData, error: rubricsError } = await supabase
        .from("judging_rubrics")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order");

      if (rubricsError) throw rubricsError;
      setRubrics(rubricsData || []);

      // Fetch existing scores from this judge
      if (user) {
        const { data: existingScores, error: scoresError } = await supabase
          .from("judge_scores")
          .select("*")
          .eq("submission_id", submissionId)
          .eq("judge_id", user.id);

        if (scoresError) throw scoresError;

        const scoresMap: Record<string, { score: number; feedback: string }> = {};
        existingScores?.forEach((s) => {
          scoresMap[s.rubric_id] = { score: s.score, feedback: s.feedback || "" };
        });
        setScores(scoresMap);
      }
    } catch (error) {
      console.error("Error fetching judging data:", error);
    } finally {
      setLoading(false);
    }
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
    if (!user) return;

    setSaving(true);
    try {
      for (const rubric of rubrics) {
        const scoreData = scores[rubric.id];
        if (scoreData) {
          const { error } = await supabase
            .from("judge_scores")
            .upsert({
              submission_id: submissionId,
              judge_id: user.id,
              rubric_id: rubric.id,
              score: scoreData.score,
              feedback: scoreData.feedback || null,
            }, {
              onConflict: 'submission_id,judge_id,rubric_id'
            });

          if (error) throw error;
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

    return totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(1) : 0;
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

  if (!submission) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Submission not found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Judge: {submission.title}
            </CardTitle>
            <CardDescription>
              Team: {submission.team?.name}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            <Star className="h-4 w-4 mr-1 text-primary" />
            {calculateTotalScore()}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Submission Links */}
        <div className="flex flex-wrap gap-2">
          {submission.github_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={submission.github_url} target="_blank" rel="noopener noreferrer">
                GitHub <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          {submission.demo_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={submission.demo_url} target="_blank" rel="noopener noreferrer">
                Demo <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          {submission.video_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={submission.video_url} target="_blank" rel="noopener noreferrer">
                Video <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
        </div>

        {submission.description && (
          <p className="text-sm text-muted-foreground">{submission.description}</p>
        )}

        <Separator />

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
    </Card>
  );
}
