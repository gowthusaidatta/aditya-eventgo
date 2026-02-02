import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
      
      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center text-white">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-lg opacity-90">
            Join thousands of students, colleges, and companies already using EventGo to connect, learn, and grow.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/signup?type=student")}
              className="gap-2"
            >
              Sign Up as Student
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/signup?type=college")}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Sign Up as College
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/signup?type=company")}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Sign Up as Company
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
