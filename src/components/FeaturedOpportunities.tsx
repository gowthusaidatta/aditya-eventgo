import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Clock, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data for now
const featuredOpportunities = [
  {
    id: "1",
    title: "Frontend Developer Intern",
    company_name: "TechCorp India",
    opportunity_type: "internship",
    location: "Bangalore (Remote)",
    salary_range: "₹20,000 - ₹30,000/month",
    deadline: "2026-02-28",
  },
  {
    id: "2",
    title: "Full Stack Developer",
    company_name: "StartupX",
    opportunity_type: "job",
    location: "Hyderabad",
    salary_range: "₹8-12 LPA",
    deadline: "2026-03-15",
  },
  {
    id: "3",
    title: "Smart India Hackathon 2026",
    company_name: "Government of India",
    opportunity_type: "hackathon",
    location: "Pan India",
    salary_range: "₹1,00,000 Prize",
    deadline: "2026-04-01",
  },
  {
    id: "4",
    title: "Data Science Intern",
    company_name: "Analytics Pro",
    opportunity_type: "internship",
    location: "Mumbai (Hybrid)",
    salary_range: "₹25,000/month",
    deadline: "2026-03-10",
  },
];

const typeColors: Record<string, string> = {
  job: "bg-primary/10 text-primary",
  internship: "bg-secondary/10 text-secondary",
  hackathon: "bg-accent/10 text-accent",
};

export function FeaturedOpportunities() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Featured Opportunities</h2>
            <p className="mt-2 text-muted-foreground">Jobs, internships, and hackathons for your career</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/opportunities")}>
            View All
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featuredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <Badge className={typeColors[opportunity.opportunity_type] || "bg-muted"}>
                  {opportunity.opportunity_type}
                </Badge>
                <h3 className="line-clamp-1 text-lg font-semibold">{opportunity.title}</h3>
              </CardHeader>
              <CardContent className="space-y-3 pb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{opportunity.company_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{opportunity.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />
                  <span>{opportunity.salary_range}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Deadline: {new Date(opportunity.deadline).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate(`/opportunities/${opportunity.id}`)}>
                  Apply Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
