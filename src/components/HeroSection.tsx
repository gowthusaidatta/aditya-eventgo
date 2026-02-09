import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Code2 } from "lucide-react";
const eventgoLogo = "/assets/logos/eventgo-logo.webp";

const stats = [
  { value: "500+", label: "Events" },
  { value: "100+", label: "Colleges" },
  { value: "200+", label: "Hackathons" },
  { value: "50K+", label: "Students" },
];

const features = [
  {
    icon: Calendar,
    title: "College Events",
    description: "Explore fests, workshops, seminars & competitions",
  },
  {
    icon: Code2,
    title: "Hackathons",
    description: "Build, compete & win exciting prizes",
  },
];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="hero-section relative overflow-hidden py-16 md:py-24">
      {/* Background decorative elements */}
      <div className="absolute left-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute right-0 top-1/4 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <img src={eventgoLogo} alt="EventGo" className="h-16 w-auto" />
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="mb-4 animate-fade-in text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            Where Students Connect to{" "}
            <span className="text-primary">Opportunity</span>
          </h1>

          <p className="mb-8 animate-fade-in text-base text-white/70 md:text-lg">
            Discover college events and hackathons. Your gateway to
            campus experiences and competitions.
          </p>

          {/* Search Bar */}
          <div className="mx-auto mb-12 flex max-w-xl animate-fade-in-up gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events, hackathons..."
                className="h-12 bg-white pl-12 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button size="lg" className="h-12 px-8" onClick={() => navigate("/events")}>
              Explore
            </Button>
          </div>

          {/* Stats */}
          <div className="mb-12 grid animate-fade-in-up grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="mx-auto grid max-w-2xl animate-fade-in-up gap-4 md:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur transition-all hover:border-primary/50 hover:bg-white/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
