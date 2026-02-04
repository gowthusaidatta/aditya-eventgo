-- Create storage bucket for event media
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', true);

-- Policy for anyone to view event media (public bucket)
CREATE POLICY "Public can view event media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-media');

-- Policy for authorized users to upload event media
CREATE POLICY "Authorized users can upload event media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-media' 
  AND (
    has_admin_college_role(auth.uid()) 
    OR has_college_role(auth.uid(), 'staff_coordinator'::college_role)
    OR is_admin(auth.uid())
  )
);

-- Policy for authorized users to update event media
CREATE POLICY "Authorized users can update event media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-media' 
  AND (
    has_admin_college_role(auth.uid()) 
    OR is_admin(auth.uid())
  )
);

-- Policy for authorized users to delete event media
CREATE POLICY "Authorized users can delete event media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-media' 
  AND (
    has_admin_college_role(auth.uid()) 
    OR is_admin(auth.uid())
  )
);

-- Add video_url column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS video_url text;