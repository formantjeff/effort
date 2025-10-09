-- Create storage bucket for chart images
INSERT INTO storage.buckets (id, name, public)
VALUES ('effort-charts', 'effort-charts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for effort-charts bucket
-- Allow public read access
CREATE POLICY "Public read access for effort charts" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'effort-charts');

-- Allow authenticated users to upload/update their own chart images
CREATE POLICY "Users can upload their own chart images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'effort-charts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own chart images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'effort-charts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own chart images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'effort-charts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
