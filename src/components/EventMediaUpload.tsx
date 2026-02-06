import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/integrations/api/apiClient";
import { useToast } from "@/hooks/use-toast";
import { X, Image, Video } from "lucide-react";

interface EventMediaUploadProps {
  imageUrl: string | null;
  videoUrl: string | null;
  onImageChange: (url: string | null) => void;
  onVideoChange: (url: string | null) => void;
}

export function EventMediaUpload({ imageUrl, videoUrl, onImageChange, onVideoChange }: EventMediaUploadProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const uploadMeta = await apiClient.createMediaUploadUrl({
        fileName: file.name,
        contentType: file.type,
        folder: "images",
      });

      await fetch(uploadMeta.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      onImageChange(uploadMeta.publicUrl);
      toast({
        title: "Image uploaded",
        description: "Event image has been uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please upload a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video must be less than 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingVideo(true);
    try {
      const uploadMeta = await apiClient.createMediaUploadUrl({
        fileName: file.name,
        contentType: file.type,
        folder: "videos",
      });

      await fetch(uploadMeta.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      onVideoChange(uploadMeta.publicUrl);
      toast({
        title: "Video uploaded",
        description: "Event video has been uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeImage = () => {
    onImageChange(null);
  };

  const removeVideo = () => {
    onVideoChange(null);
  };

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Event Image
        </Label>
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Event preview"
              className="h-32 w-full rounded-lg object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="cursor-pointer"
            />
            {uploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          Event Video (optional)
        </Label>
        {videoUrl ? (
          <div className="relative">
            <video
              src={videoUrl}
              className="h-32 w-full rounded-lg object-cover"
              controls
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={removeVideo}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              disabled={uploadingVideo}
              className="cursor-pointer"
            />
            {uploadingVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
