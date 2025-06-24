-- Create stories table
CREATE TABLE stories (
  id VARCHAR(8) PRIMARY KEY DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  story_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Enable RLS for the stories table (but allow all operations since no auth is required)
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations on stories table
CREATE POLICY "Allow all operations on stories" ON stories
FOR ALL USING (true);

-- Create policy to allow all operations on storage
CREATE POLICY "Allow all operations on videos bucket" ON storage.objects
FOR ALL USING (bucket_id = 'videos');

-- Create reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id VARCHAR(8) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for the reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations on reviews table
CREATE POLICY "Allow all operations on reviews" ON reviews
FOR ALL USING (true);