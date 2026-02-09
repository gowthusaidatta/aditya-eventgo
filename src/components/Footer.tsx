import { Link } from "react-router-dom";
const eventgoLogo = "/assets/logos/eventgo-logo.webp";
const adityaLogo = "/assets/logos/aditya-university-logo.webp";

export function Footer() {
  return (
    <footer className="border-t bg-secondary text-white">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <img src={eventgoLogo} alt="EventGo" className="h-10 w-auto" />
            <p className="text-sm text-white/60">
              Connecting colleges and students through events and hackathons.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">In collaboration with</span>
              <img src={adityaLogo} alt="Aditya University" className="h-6 w-auto" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <nav className="flex flex-col gap-2 text-sm text-white/60">
              <Link to="/events" className="hover:text-white">Events</Link>
              <Link to="/hackathons" className="hover:text-white">Hackathons</Link>
              <Link to="/about" className="hover:text-white">About Us</Link>
            </nav>
          </div>

          {/* For Users */}
          <div className="space-y-4">
            <h4 className="font-semibold">For Users</h4>
            <nav className="flex flex-col gap-2 text-sm text-white/60">
              <Link to="/signup?type=student" className="hover:text-white">Student Signup</Link>
              <Link to="/signup?type=college" className="hover:text-white">College Signup</Link>
              <Link to="/login" className="hover:text-white">Login</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-white/60">
              <p>support@eventgo.tech</p>
              <p>Aditya University Campus</p>
              <p>Andhra Pradesh, India</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-white/60">
          <p>© {new Date().getFullYear()} EventGo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
