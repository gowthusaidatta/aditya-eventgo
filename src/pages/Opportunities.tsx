import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Clock, IndianRupee, Search } from "lucide-react";
import { useState } from "react";

// Mock data
const allOpportunities = [
  {
    id: "1",
    title: "Frontend Developer Intern",
    company_name: "TechCorp India",
    opportunity_type: "internship",
    location: "Bangalore (Remote)",
    salary_range: "₹20,000 - ₹30,000/month",
    deadline: "2026-02-28",
    description: "Join our team to build modern web applications using React and TypeScript.",
  },
  {
    id: "2",
    title: "Full Stack Developer",
    company_name: "StartupX",
    opportunity_type: "job",
    location: "Hyderabad",
    salary_range: "₹8-12 LPA",
    deadline: "2026-03-15",
    description: "Looking for experienced developers to lead our product development.",
  },
  {
    id: "3",
    title: "Smart India Hackathon 2026",
    company_name: "Government of India",
    opportunity_type: "hackathon",
    location: "Pan India",
    salary_range: "₹1,00,000 Prize",
    deadline: "2026-04-01",
    description: "Build innovative solutions for real-world problems in this national hackathon.",
  },
  {
    id: "4",
    title: "Data Science Intern",
    company_name: "Analytics Pro",
    opportunity_type: "internship",
    location: "Mumbai (Hybrid)",
    salary_range: "₹25,000/month",
    deadline: "2026-03-10",
    description: "Work on machine learning projects with our data science team.",
  },
  {
    id: "5",
    title: "UI/UX Designer",
    company_name: "DesignHub",
    opportunity_type: "job",
    location: "Remote",
    salary_range: "₹6-10 LPA",
    deadline: "2026-03-20",
    description: "Design beautiful and intuitive user experiences for our products.",
  },
  {
    id: "6",
    title: "Code for Change Hackathon",
    company_name: "Social Impact Foundation",
    opportunity_type: "hackathon",
    location: "Delhi NCR",
    salary_range: "₹50,000 Prize",
    deadline: "2026-04-15",
    description: "Create technology solutions for social good.",
  },
];

const typeColors: Record<string, string> = {
  job: "bg-primary/10 text-primary",
  internship: "bg-secondary/10 text-secondary",
  hackathon: "bg-accent/10 text-accent",
};

export default function Opportunities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredOpportunities = allOpportunities.filter((opp) => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || opp.opportunity_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="mt-2 text-muted-foreground">Find jobs, internships, and hackathons</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Opportunity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="internship">Internships</SelectItem>
              <SelectItem value="hackathon">Hackathons</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Opportunities Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <Badge className={typeColors[opportunity.opportunity_type] || "bg-muted"}>
                  {opportunity.opportunity_type}
                </Badge>
                <h3 className="line-clamp-1 text-lg font-semibold">{opportunity.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{opportunity.description}</p>
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
                <Button variant="outline" className="w-full">
                  Apply Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredOpportunities.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No opportunities found matching your criteria.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
