// Platform Types for EventGo

export type PlatformRole = 'super_admin' | 'organizer' | 'participant' | 'judge' | 'mentor' | 'volunteer';
export type EventMode = 'online' | 'offline' | 'hybrid';
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled' | 'attended';
export type TeamStatus = 'forming' | 'complete' | 'competing' | 'disqualified' | 'winner';
export type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'evaluated' | 'finalist';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type CertificateType = 'participation' | 'winner' | 'runner_up' | 'appreciation' | 'volunteer' | 'mentor' | 'judge';
export type HackathonRound = 'idea' | 'prototype' | 'semifinal' | 'final';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  max_participants: number | null;
  image_url: string | null;
  video_url: string | null;
  college_id: string | null;
  created_by: string | null;
  is_featured: boolean | null;
  created_at: string;
  updated_at: string;
  // New fields
  mode?: EventMode;
  status?: EventStatus;
  registration_deadline?: string | null;
  registration_fee?: number;
  waitlist_enabled?: boolean;
  waitlist_count?: number;
  tags?: string[];
  venue_details?: Record<string, unknown>;
  online_link?: string | null;
  is_hackathon?: boolean;
  team_size_min?: number;
  team_size_max?: number;
  prizes?: Prize[];
  sponsors?: Sponsor[];
  faqs?: FAQ[];
}

export interface Prize {
  position: string;
  amount: number;
  description?: string;
}

export interface Sponsor {
  name: string;
  logo_url?: string;
  website?: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  leader_id: string;
  invite_code: string;
  status: TeamStatus;
  problem_statement_id: string | null;
  mentor_id: string | null;
  current_round: HackathonRound;
  total_score: number;
  rank: number | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  invited_email: string;
  invited_by: string;
  status: InviteStatus;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface ProblemStatement {
  id: string;
  event_id: string;
  title: string;
  description: string;
  category: string | null;
  difficulty: string;
  max_teams: number | null;
  resources: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  team_id: string;
  event_id: string;
  round: HackathonRound;
  title: string;
  description: string | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  drive_link: string | null;
  file_urls: string[];
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JudgingRubric {
  id: string;
  event_id: string;
  round: HackathonRound | null;
  criteria_name: string;
  description: string | null;
  max_score: number;
  weight: number;
  sort_order: number;
  created_at: string;
}

export interface JudgeScore {
  id: string;
  submission_id: string;
  judge_id: string;
  rubric_id: string;
  score: number;
  feedback: string | null;
  scored_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  event_id: string;
  registration_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  coupon_code: string | null;
  discount_amount: number;
  invoice_number: string | null;
  invoice_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  event_id: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  min_amount: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Certificate {
  id: string;
  certificate_id: string;
  user_id: string;
  event_id: string;
  team_id: string | null;
  type: CertificateType;
  recipient_name: string;
  recipient_email: string | null;
  issue_date: string;
  template_data: Record<string, unknown> | null;
  pdf_url: string | null;
  qr_code_url: string | null;
  verification_url: string | null;
  is_valid: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  event_id: string | null;
  created_at: string;
}

export interface EventSchedule {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  speaker_image: string | null;
  session_type: string;
  day_number: number;
  sort_order: number;
  created_at: string;
}

export interface PlatformRoleAssignment {
  id: string;
  user_id: string;
  role: PlatformRole;
  event_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
}
