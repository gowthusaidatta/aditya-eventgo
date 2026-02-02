import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-base font-bold text-primary-foreground">E</span>
              </div>
              <span className="text-lg font-bold">EventGo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting colleges, students, and companies through events and opportunities.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>In collaboration with</span>
              <span className="font-semibold text-foreground">Aditya University</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/events" className="hover:text-foreground">Events</Link>
              <Link to="/opportunities" className="hover:text-foreground">Opportunities</Link>
              <Link to="/about" className="hover:text-foreground">About Us</Link>
              <Link to="/contact" className="hover:text-foreground">Contact</Link>
            </nav>
          </div>

          {/* For Users */}
          <div className="space-y-4">
            <h4 className="font-semibold">For Users</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/signup?type=student" className="hover:text-foreground">Student Signup</Link>
              <Link to="/signup?type=college" className="hover:text-foreground">College Signup</Link>
              <Link to="/signup?type=company" className="hover:text-foreground">Company Signup</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>support@eventgo.com</p>
              <p>Aditya University Campus</p>
              <p>Andhra Pradesh, India</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} EventGo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
