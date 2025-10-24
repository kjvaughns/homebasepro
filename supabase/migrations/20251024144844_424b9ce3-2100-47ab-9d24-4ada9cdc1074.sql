-- Add business address fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_city TEXT,
ADD COLUMN IF NOT EXISTS business_state TEXT,
ADD COLUMN IF NOT EXISTS business_zip TEXT,
ADD COLUMN IF NOT EXISTS business_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS business_lng NUMERIC(10, 7);

-- Add coordinates to homes table for better provider matching
ALTER TABLE homes
ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);

-- Create help_articles table for in-app help center
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('homeowner', 'provider', 'both')),
  order_index INTEGER DEFAULT 0,
  screenshot_urls JSONB DEFAULT '[]'::jsonb,
  related_article_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_user_type ON help_articles(user_type);

-- Enable RLS for help_articles
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read help articles
CREATE POLICY "Anyone can view help articles"
  ON help_articles FOR SELECT
  USING (true);

-- Only admins can manage help articles
CREATE POLICY "Admins can manage help articles"
  ON help_articles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create help_article_feedback table
CREATE TABLE IF NOT EXISTS help_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES help_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

-- Enable RLS for help_article_feedback
ALTER TABLE help_article_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON help_article_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON help_article_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update their own feedback"
  ON help_article_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON help_article_feedback FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create tutorial_progress table for tracking user progress
CREATE TABLE IF NOT EXISTS tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('homeowner', 'provider')),
  step_id UUID REFERENCES tutorial_steps(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_id)
);

-- Enable RLS for tutorial_progress
ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view their own tutorial progress"
  ON tutorial_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own tutorial progress"
  ON tutorial_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their own tutorial progress"
  ON tutorial_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Add enhanced tutorial fields to tutorial_steps
ALTER TABLE tutorial_steps
ADD COLUMN IF NOT EXISTS element_selector TEXT,
ADD COLUMN IF NOT EXISTS position TEXT CHECK (position IN ('top', 'bottom', 'left', 'right', 'center')),
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_criteria JSONB DEFAULT '{}'::jsonb;