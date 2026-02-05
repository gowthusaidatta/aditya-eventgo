import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, Users, Calendar,
  Activity, UserPlus, CalendarCheck, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import { 
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";

interface RegistrationStats {
  totalRegistrations: number;
  hackathonRegistrations: number;
  eventRegistrations: number;
  registrationsThisWeek: number;
  registrationsLastWeek: number;
  growthPercentage: number;
}

interface EventStats {
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  upcomingEvents: number;
}

interface UserStats {
  totalUsers: number;
  students: number;
  collegeStaff: number;
  verifiedUsers: number;
  newUsersThisWeek: number;
  userGrowthPercentage: number;
}

interface DailyRegistration {
  date: string;
  registrations: number;
  hackathons: number;
  events: number;
}

interface EventTypeDistribution {
  name: string;
  value: number;
  color: string;
}

export default function AnalyticsDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<string>("7d");
  
  const [registrationStats, setRegistrationStats] = useState<RegistrationStats>({
    totalRegistrations: 0,
    hackathonRegistrations: 0,
    eventRegistrations: 0,
    registrationsThisWeek: 0,
    registrationsLastWeek: 0,
    growthPercentage: 0,
  });
  
  const [eventStats, setEventStats] = useState<EventStats>({
    totalEvents: 0,
    activeEvents: 0,
    completedEvents: 0,
    upcomingEvents: 0,
  });
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    students: 0,
    collegeStaff: 0,
    verifiedUsers: 0,
    newUsersThisWeek: 0,
    userGrowthPercentage: 0,
  });
  
  const [dailyRegistrations, setDailyRegistrations] = useState<DailyRegistration[]>([]);
  const [eventTypeDistribution, setEventTypeDistribution] = useState<EventTypeDistribution[]>([]);
  const [topEvents, setTopEvents] = useState<{ title: string; registrations: number }[]>([]);

  useEffect(() => {
    if (!loading && (!user || profile?.user_type !== "admin")) {
      navigate("/");
      return;
    }
    
    if (user && profile?.user_type === "admin") {
      fetchAnalytics();
    }
  }, [user, profile, loading, navigate, timeRange]);

  const fetchAnalytics = async () => {
    await Promise.all([
      fetchRegistrationStats(),
      fetchEventStats(),
      fetchUserStats(),
      fetchDailyRegistrations(),
      fetchEventTypeDistribution(),
      fetchTopEvents(),
    ]);
  };

  const getDateRange = () => {
    const now = new Date();
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now, days };
  };

  const fetchRegistrationStats = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Fetch hackathon registrations
    const { count: hackathonCount } = await supabase
      .from("hackathon_registrations")
      .select("*", { count: "exact" });

    // Fetch event registrations
    const { count: eventCount } = await supabase
      .from("event_registrations")
      .select("*", { count: "exact" });

    // This week's registrations
    const { count: hackathonThisWeek } = await supabase
      .from("hackathon_registrations")
      .select("*", { count: "exact" })
      .gte("registered_at", weekAgo.toISOString());

    const { count: eventThisWeek } = await supabase
      .from("event_registrations")
      .select("*", { count: "exact" })
      .gte("registered_at", weekAgo.toISOString());

    // Last week's registrations
    const { count: hackathonLastWeek } = await supabase
      .from("hackathon_registrations")
      .select("*", { count: "exact" })
      .gte("registered_at", twoWeeksAgo.toISOString())
      .lt("registered_at", weekAgo.toISOString());

    const { count: eventLastWeek } = await supabase
      .from("event_registrations")
      .select("*", { count: "exact" })
      .gte("registered_at", twoWeeksAgo.toISOString())
      .lt("registered_at", weekAgo.toISOString());

    const thisWeek = (hackathonThisWeek || 0) + (eventThisWeek || 0);
    const lastWeek = (hackathonLastWeek || 0) + (eventLastWeek || 0);
    const growthPercentage = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : thisWeek > 0 ? 100 : 0;

    setRegistrationStats({
      totalRegistrations: (hackathonCount || 0) + (eventCount || 0),
      hackathonRegistrations: hackathonCount || 0,
      eventRegistrations: eventCount || 0,
      registrationsThisWeek: thisWeek,
      registrationsLastWeek: lastWeek,
      growthPercentage,
    });
  };

  const fetchEventStats = async () => {
    const now = new Date().toISOString();
    
    const { count: totalEvents } = await supabase
      .from("events")
      .select("*", { count: "exact" });

    const { count: activeEvents } = await supabase
      .from("events")
      .select("*", { count: "exact" })
      .lte("start_date", now)
      .or(`end_date.gte.${now},end_date.is.null`);

    const { count: completedEvents } = await supabase
      .from("events")
      .select("*", { count: "exact" })
      .lt("end_date", now);

    const { count: upcomingEvents } = await supabase
      .from("events")
      .select("*", { count: "exact" })
      .gt("start_date", now);

    setEventStats({
      totalEvents: totalEvents || 0,
      activeEvents: activeEvents || 0,
      completedEvents: completedEvents || 0,
      upcomingEvents: upcomingEvents || 0,
    });
  };

  const fetchUserStats = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const { data: users } = await supabase
      .from("profiles")
      .select("*");

    const allUsers = users || [];
    const students = allUsers.filter(u => u.user_type === "student").length;
    const collegeStaff = allUsers.filter(u => u.user_type === "college").length;
    const verifiedUsers = allUsers.filter(u => u.is_verified).length;
    
    const newThisWeek = allUsers.filter(u => 
      new Date(u.created_at) >= weekAgo
    ).length;
    
    const newLastWeek = allUsers.filter(u => 
      new Date(u.created_at) >= twoWeeksAgo && new Date(u.created_at) < weekAgo
    ).length;

    const userGrowthPercentage = newLastWeek > 0 
      ? ((newThisWeek - newLastWeek) / newLastWeek) * 100 
      : newThisWeek > 0 ? 100 : 0;

    setUserStats({
      totalUsers: allUsers.length,
      students,
      collegeStaff,
      verifiedUsers,
      newUsersThisWeek: newThisWeek,
      userGrowthPercentage,
    });
  };

  const fetchDailyRegistrations = async () => {
    const { startDate, days } = getDateRange();
    
    // Fetch all registrations in range
    const { data: hackathonRegs } = await supabase
      .from("hackathon_registrations")
      .select("registered_at")
      .gte("registered_at", startDate.toISOString());

    const { data: eventRegs } = await supabase
      .from("event_registrations")
      .select("registered_at")
      .gte("registered_at", startDate.toISOString());

    // Group by date
    const dateMap = new Map<string, { registrations: number; hackathons: number; events: number }>();
    
    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      dateMap.set(dateStr, { registrations: 0, hackathons: 0, events: 0 });
    }

    // Count hackathon registrations
    (hackathonRegs || []).forEach(reg => {
      const dateStr = reg.registered_at.split("T")[0];
      const existing = dateMap.get(dateStr);
      if (existing) {
        existing.hackathons++;
        existing.registrations++;
      }
    });

    // Count event registrations
    (eventRegs || []).forEach(reg => {
      const dateStr = reg.registered_at.split("T")[0];
      const existing = dateMap.get(dateStr);
      if (existing) {
        existing.events++;
        existing.registrations++;
      }
    });

    const dailyData: DailyRegistration[] = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...data,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setDailyRegistrations(dailyData);
  };

  const fetchEventTypeDistribution = async () => {
    const { data: events } = await supabase
      .from("events")
      .select("event_type");

    const typeCount = new Map<string, number>();
    (events || []).forEach(event => {
      const count = typeCount.get(event.event_type) || 0;
      typeCount.set(event.event_type, count + 1);
    });

    const colors = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
    const distribution: EventTypeDistribution[] = Array.from(typeCount.entries())
      .map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: colors[index % colors.length],
      }));

    setEventTypeDistribution(distribution);
  };

  const fetchTopEvents = async () => {
    // Get registration counts per event
    const { data: hackathonRegs } = await supabase
      .from("hackathon_registrations")
      .select("event_id");

    const { data: eventRegs } = await supabase
      .from("event_registrations")
      .select("event_id");

    const eventCounts = new Map<string, number>();
    
    (hackathonRegs || []).forEach(reg => {
      eventCounts.set(reg.event_id, (eventCounts.get(reg.event_id) || 0) + 1);
    });
    
    (eventRegs || []).forEach(reg => {
      eventCounts.set(reg.event_id, (eventCounts.get(reg.event_id) || 0) + 1);
    });

    // Get event titles
    const eventIds = Array.from(eventCounts.keys());
    if (eventIds.length === 0) {
      setTopEvents([]);
      return;
    }

    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .in("id", eventIds);

    const topEventsList = (events || [])
      .map(event => ({
        title: event.title,
        registrations: eventCounts.get(event.id) || 0,
      }))
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 5);

    setTopEvents(topEventsList);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Track event registrations and user engagement</p>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Registrations</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{registrationStats.totalRegistrations}</div>
              <div className="flex items-center gap-1 text-xs">
                {registrationStats.growthPercentage >= 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">+{registrationStats.growthPercentage.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">{registrationStats.growthPercentage.toFixed(1)}%</span>
                  </>
                )}
                <span className="text-muted-foreground">from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalUsers}</div>
              <div className="flex items-center gap-1 text-xs">
                <UserPlus className="h-4 w-4 text-green-500" />
                <span className="text-green-500">+{userStats.newUsersThisWeek}</span>
                <span className="text-muted-foreground">new this week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventStats.activeEvents}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{eventStats.upcomingEvents} upcoming</span>
                <span>•</span>
                <span>{eventStats.completedEvents} completed</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Engagement Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats.totalUsers > 0 
                  ? ((registrationStats.totalRegistrations / userStats.totalUsers) * 100).toFixed(1) 
                  : 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                registrations per user
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Registration Trend */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Registration Trend</CardTitle>
                  <CardDescription>Daily registrations over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyRegistrations}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))", 
                            border: "1px solid hsl(var(--border))" 
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="registrations" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Event Type Distribution */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Event Types</CardTitle>
                  <CardDescription>Distribution of events by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={eventTypeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {eventTypeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Events */}
            <Card>
              <CardHeader>
                <CardTitle>Top Events by Registrations</CardTitle>
                <CardDescription>Most popular events based on registration count</CardDescription>
              </CardHeader>
              <CardContent>
                {topEvents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No registration data available yet</p>
                ) : (
                  <div className="space-y-4">
                    {topEvents.map((event, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{event.title}</p>
                          <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ 
                                width: `${(event.registrations / (topEvents[0]?.registrations || 1)) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                        <span className="font-bold text-lg">{event.registrations}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Hackathon Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{registrationStats.hackathonRegistrations}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Event Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-secondary">{registrationStats.eventRegistrations}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{registrationStats.registrationsThisWeek}</div>
                  <p className="text-xs text-muted-foreground">
                    vs {registrationStats.registrationsLastWeek} last week
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Hackathons vs Events</CardTitle>
                <CardDescription>Registration comparison by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyRegistrations}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))" 
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="hackathons" fill="hsl(var(--primary))" name="Hackathons" />
                      <Bar dataKey="events" fill="hsl(var(--secondary))" name="Events" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{eventStats.totalEvents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{eventStats.activeEvents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">{eventStats.upcomingEvents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-muted-foreground">{eventStats.completedEvents}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{userStats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">{userStats.students}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">College Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-500">{userStats.collegeStaff}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Verified</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{userStats.verifiedUsers}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
