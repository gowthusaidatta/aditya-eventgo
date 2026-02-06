import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/integrations/api/apiClient";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, GraduationCap, Building2, Hash, BookOpen, Calendar, Shield, CheckCircle, XCircle } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  college_name: z.string().optional(),
  branch: z.string().optional(),
  roll_number: z.string().optional(),
  graduation_year: z.string().optional(),
  college_id: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      college_name: "",
      branch: "",
      roll_number: "",
      graduation_year: "",
      college_id: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        college_name: profile.college_name || "",
        branch: profile.branch || "",
        roll_number: profile.roll_number || "",
        graduation_year: profile.graduation_year?.toString() || "",
        college_id: profile.college_id || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setSaving(true);
    let didUpdate = false;
    try {
      await apiClient.updateProfile({
        full_name: data.full_name,
        phone: data.phone || null,
        college_name: data.college_name || null,
        branch: data.branch || null,
        roll_number: data.roll_number || null,
        graduation_year: data.graduation_year ? parseInt(data.graduation_year) : null,
        college_id: data.college_id || null,
      });
      didUpdate = true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }

    if (didUpdate) {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case "student":
        return "Student";
      case "college":
        return "College Staff";
      case "admin":
        return "Administrator";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Badge variant="outline">
                      {getUserTypeLabel(profile.user_type)}
                    </Badge>
                    <Badge variant={profile.is_verified ? "default" : "secondary"}>
                      {profile.is_verified ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Verified
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Pending Verification
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant={editing ? "outline" : "default"}
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                {editing ? "Update your profile details below" : "Your personal information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {profile.user_type === "student" && (
                      <>
                        <FormField
                          control={form.control}
                          name="roll_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Roll Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your roll number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="college_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>College Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your college name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="branch"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Branch</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Computer Science" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="graduation_year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Graduation Year</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 2026" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {profile.user_type === "college" && (
                      <>
                        <FormField
                          control={form.control}
                          name="college_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>College ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your college ID" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="college_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>College/University Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter college name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{profile.full_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{profile.phone || "Not provided"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Account Type</p>
                        <p className="font-medium">{getUserTypeLabel(profile.user_type)}</p>
                      </div>
                    </div>
                  </div>

                  {profile.user_type === "student" && (
                    <>
                      <Separator />
                      <h3 className="font-semibold">Academic Information</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3">
                          <Hash className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Roll Number</p>
                            <p className="font-medium">{profile.roll_number || "Not provided"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">College</p>
                            <p className="font-medium">{profile.college_name || "Not provided"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Branch</p>
                            <p className="font-medium">{profile.branch || "Not provided"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Graduation Year</p>
                            <p className="font-medium">{profile.graduation_year || "Not provided"}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {profile.user_type === "college" && (
                    <>
                      <Separator />
                      <h3 className="font-semibold">Institution Information</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3">
                          <Hash className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">College ID</p>
                            <p className="font-medium">{profile.college_id || "Not provided"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Institution</p>
                            <p className="font-medium">{profile.college_name || "Not provided"}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {profile.is_verified ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Your account is verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">
                      {profile.user_type === "college"
                        ? "Pending admin verification"
                        : "Your account is pending verification"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
