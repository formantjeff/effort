-- Create slack_users table to link Slack accounts with app accounts
CREATE TABLE IF NOT EXISTS slack_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_user_id TEXT UNIQUE NOT NULL,
  slack_team_id TEXT NOT NULL,
  slack_access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_slack_users_updated_at
  BEFORE UPDATE ON slack_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE slack_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own Slack linking
CREATE POLICY "Users can view their own Slack links" ON slack_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own Slack linking
CREATE POLICY "Users can insert their own Slack links" ON slack_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own Slack linking
CREATE POLICY "Users can update their own Slack links" ON slack_users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own Slack linking
CREATE POLICY "Users can delete their own Slack links" ON slack_users
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_slack_users_slack_user_id ON slack_users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_users_user_id ON slack_users(user_id);
