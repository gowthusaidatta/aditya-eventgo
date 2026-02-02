import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function About() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold">About EventGo</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-semibold">Our Mission</h2>
              <p className="text-muted-foreground">
                EventGo is a platform designed to bridge the gap between colleges, students, and companies.
                We believe that connecting people with the right opportunities can transform careers and communities.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold">In Collaboration with Aditya University</h2>
              <p className="text-muted-foreground">
                We're proud to partner with Aditya University to bring this platform to life. Together, we're
                creating a space where students can discover events, find internships, and launch their careers.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold">What We Offer</h2>
              <ul className="list-inside list-disc space-y-2 text-muted-foreground">
                <li>A centralized platform for college events and activities</li>
                <li>Job and internship listings from top companies</li>
                <li>Hackathon opportunities to showcase your skills</li>
                <li>Easy event registration and management</li>
                <li>Role-based access for college staff and coordinators</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold">Contact Us</h2>
              <p className="text-muted-foreground">
                Have questions or suggestions? Reach out to us at{" "}
                <a href="mailto:support@eventgo.com" className="text-primary hover:underline">
                  support@eventgo.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
