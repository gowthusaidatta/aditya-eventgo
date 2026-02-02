import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Briefcase, Users } from "lucide-react";

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="container relative py-24 md:py-32">
        {/* Decorative elements */}
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Collaboration Badge */}
          <div className="mb-8 inline-flex animate-fade-in items-center gap-3 rounded-full border bg-background/80 px-4 py-2 backdrop-blur">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <span className="text-xs font-bold text-primary-foreground">E</span>
            </div>
            <span className="text-sm font-medium">EventGo × Aditya University</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
              <span className="text-xs font-bold text-secondary-foreground">A</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 animate-fade-in text-4xl font-bold tracking-tight md:text-6xl">
            Your Gateway to{" "}
            <span className="text-gradient-primary">Events</span>,{" "}
            <span className="text-gradient-primary">Opportunities</span> & More
          </h1>

          <p className="mb-8 animate-fade-in text-lg text-muted-foreground md:text-xl">
            Connect with colleges, discover events, find internships, and launch your career—all in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="mb-16 flex animate-fade-in flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={() => navigate("/signup")} className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/events")}>
              Explore Events
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid animate-fade-in gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 text-left transition-shadow hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">Events</h3>
              <p className="text-sm text-muted-foreground">
                Workshops, seminars, fests, and more from top colleges.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-left transition-shadow hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <Briefcase className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-2 font-semibold">Opportunities</h3>
              <p className="text-sm text-muted-foreground">
                Jobs, internships, and hackathons to boost your career.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-left transition-shadow hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 font-semibold">Community</h3>
              <p className="text-sm text-muted-foreground">
                Connect with students, colleges, and companies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
