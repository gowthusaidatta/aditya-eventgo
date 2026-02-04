import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, MessageCircle, Download } from "lucide-react";

interface EventShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  eventType: string;
}

export function EventShareDialog({ open, onOpenChange, eventId, eventTitle, eventType }: EventShareDialogProps) {
  const { toast } = useToast();

  // Generate the registration link
  const baseUrl = window.location.origin;
  const registrationPath = eventType === "hackathon" ? "/hackathons" : "/events";
  const registrationLink = `${baseUrl}${registrationPath}?register=${eventId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      toast({
        title: "Link copied!",
        description: "Registration link has been copied to clipboard",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `🎉 Check out this event!\n\n📌 ${eventTitle}\n\n📝 Register here: ${registrationLink}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Check out this event: ${eventTitle}`,
          url: registrationLink,
        });
      } catch {
        // User cancelled or share failed - this is expected behavior
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("event-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new window.Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${eventTitle.replace(/\s+/g, "-")}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Event
          </DialogTitle>
          <DialogDescription>
            Share "{eventTitle}" via QR code or link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg bg-white p-4">
              <QRCodeSVG
                id="event-qr-code"
                value={registrationLink}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadQR} className="gap-2">
              <Download className="h-4 w-4" />
              Download QR Code
            </Button>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Registration Link</label>
            <div className="flex gap-2">
              <Input
                value={registrationLink}
                readOnly
                className="flex-1 text-sm"
              />
              <Button onClick={handleCopyLink} variant="outline" className="shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleWhatsAppShare} className="gap-2 bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4" />
              Share on WhatsApp
            </Button>
            
            {navigator.share && (
              <Button onClick={handleNativeShare} variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share via Apps
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
