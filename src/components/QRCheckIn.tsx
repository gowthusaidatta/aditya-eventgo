import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QrCode, CheckCircle, XCircle, Search, UserCheck } from "lucide-react";

interface CheckInResult {
  success: boolean;
  message: string;
  registration?: {
    id: string;
    profile: {
      full_name: string;
      email: string;
    };
    check_in_time: string | null;
  };
}

interface QRCheckInProps {
  eventId: string;
}

export function QRCheckIn({ eventId }: QRCheckInProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<
    Array<{ name: string; time: string }>
  >([]);

  const handleCheckIn = async () => {
    if (!qrCode.trim() || !user) return;

    setLoading(true);
    setResult(null);

    try {
      // Find registration by QR code
      const { data: registration, error: findError } = await supabase
        .from("event_registrations")
        .select("id, user_id, check_in_time, qr_code")
        .eq("event_id", eventId)
        .eq("qr_code", qrCode.toUpperCase())
        .single();

      if (findError || !registration) {
        setResult({
          success: false,
          message: "Registration not found. Please check the QR code.",
        });
        return;
      }

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", registration.user_id)
        .single();

      const profile = profileData || { full_name: "Unknown", email: "" };

      if (registration.check_in_time) {
        setResult({
          success: false,
          message: `Already checked in at ${new Date(registration.check_in_time).toLocaleTimeString()}`,
          registration: {
            id: registration.id,
            profile,
            check_in_time: registration.check_in_time,
          },
        });
        return;
      }

      // Update check-in
      const checkInTime = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({
          check_in_time: checkInTime,
          check_in_by: user.id,
          registration_status: "attended",
        })
        .eq("id", registration.id);

      if (updateError) throw updateError;

      setResult({
        success: true,
        message: "Check-in successful!",
        registration: {
          id: registration.id,
          profile,
          check_in_time: checkInTime,
        },
      });

      // Add to recent check-ins
      setRecentCheckIns((prev) => [
        {
          name: profile.full_name,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);

      toast({
        title: "Check-in successful",
        description: `${profile.full_name} has been checked in.`,
      });

      setQrCode("");
    } catch (error: unknown) {
      const err = error as { message?: string };
      setResult({
        success: false,
        message: err.message || "An error occurred during check-in.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Check-In
          </CardTitle>
          <CardDescription>
            Scan or enter the registration QR code to check in attendees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter QR code (e.g., REG-XXXXXXXX)"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
            />
            <Button onClick={handleCheckIn} disabled={loading || !qrCode.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Checking..." : "Check In"}
            </Button>
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.success
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">{result.message}</span>
              </div>
              {result.registration && (
                <div className="mt-2 text-sm">
                  <p>
                    <strong>Name:</strong> {result.registration.profile.full_name}
                  </p>
                  <p>
                    <strong>Email:</strong> {result.registration.profile.email}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Recent Check-Ins
          </CardTitle>
          <CardDescription>
            Last 10 attendees checked in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentCheckIns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No check-ins yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentCheckIns.map((checkIn, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                >
                  <span className="font-medium">{checkIn.name}</span>
                  <Badge variant="outline">{checkIn.time}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
