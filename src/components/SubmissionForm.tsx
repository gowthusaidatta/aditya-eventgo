import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/integrations/api/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, Github, Globe, Video, FolderOpen, Send, Save } from "lucide-react";

interface SubmissionFormProps {
  teamId: string;
  eventId: string;
  round: 'idea' | 'prototype' | 'semifinal' | 'final';
  existingSubmission?: {
    id?: string;
    submission_id?: string;
    title: string;
    description: string | null;
    github_url: string | null;
    demo_url: string | null;
    video_url: string | null;
    drive_link: string | null;
    status: string;
  };
  onSubmit?: () => void;
}

export function SubmissionForm({ 
  teamId, 
  eventId, 
  round, 
  existingSubmission, 
  onSubmit 
}: SubmissionFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: existingSubmission?.title || "",
    description: existingSubmission?.description || "",
    github_url: existingSubmission?.github_url || "",
    demo_url: existingSubmission?.demo_url || "",
    video_url: existingSubmission?.video_url || "",
    drive_link: existingSubmission?.drive_link || "",
  });

  const roundLabels: Record<string, string> = {
    idea: "Idea Submission",
    prototype: "Prototype",
    semifinal: "Semi-Final",
    final: "Final Submission",
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      if (existingSubmission) {
        const submissionId = existingSubmission.submission_id || existingSubmission.id;
        if (!submissionId) throw new Error("Missing submission id");
        await apiClient.updateSubmission(submissionId, {
          event_id: eventId,
          ...formData,
          status: "draft",
        });
      } else {
        await apiClient.createSubmission({
          team_id: teamId,
          event_id: eventId,
          round,
          ...formData,
          status: "draft",
        });
      }

      toast({
        title: "Draft saved",
        description: "Your submission draft has been saved.",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error saving draft",
        description: err.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your submission.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (existingSubmission) {
        const submissionId = existingSubmission.submission_id || existingSubmission.id;
        if (!submissionId) throw new Error("Missing submission id");
        await apiClient.updateSubmission(submissionId, {
          event_id: eventId,
          ...formData,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });
      } else {
        await apiClient.createSubmission({
          team_id: teamId,
          event_id: eventId,
          round,
          ...formData,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });
      }

      toast({
        title: "Submission sent!",
        description: "Your submission has been successfully submitted for review.",
      });
      onSubmit?.();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error submitting",
        description: err.message || "Failed to submit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isSubmitted = existingSubmission?.status === "submitted";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {roundLabels[round]}
            </CardTitle>
            <CardDescription>
              Submit your project for the {round} round
            </CardDescription>
          </div>
          {existingSubmission && (
            <Badge variant={isSubmitted ? "default" : "outline"}>
              {existingSubmission.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Project Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Enter your project title"
            disabled={isSubmitted}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe your project, features, and approach..."
            rows={4}
            disabled={isSubmitted}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="github_url" className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub Repository
            </Label>
            <Input
              id="github_url"
              value={formData.github_url}
              onChange={(e) => handleChange("github_url", e.target.value)}
              placeholder="https://github.com/..."
              disabled={isSubmitted}
            />
          </div>

          <div>
            <Label htmlFor="demo_url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Live Demo URL
            </Label>
            <Input
              id="demo_url"
              value={formData.demo_url}
              onChange={(e) => handleChange("demo_url", e.target.value)}
              placeholder="https://..."
              disabled={isSubmitted}
            />
          </div>

          <div>
            <Label htmlFor="video_url" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Demo Video URL
            </Label>
            <Input
              id="video_url"
              value={formData.video_url}
              onChange={(e) => handleChange("video_url", e.target.value)}
              placeholder="YouTube or Loom link"
              disabled={isSubmitted}
            />
          </div>

          <div>
            <Label htmlFor="drive_link" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Google Drive / ZIP Link
            </Label>
            <Input
              id="drive_link"
              value={formData.drive_link}
              onChange={(e) => handleChange("drive_link", e.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={isSubmitted}
            />
          </div>
        </div>

        {!isSubmitted && (
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim()}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        )}

        {isSubmitted && (
          <p className="text-center text-muted-foreground text-sm pt-4">
            ✅ Submission received. You'll be notified when results are announced.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
