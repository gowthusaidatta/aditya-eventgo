import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FeaturedEvents } from "@/components/FeaturedEvents";
import { FeaturedOpportunities } from "@/components/FeaturedOpportunities";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturedEvents />
        <FeaturedOpportunities />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
