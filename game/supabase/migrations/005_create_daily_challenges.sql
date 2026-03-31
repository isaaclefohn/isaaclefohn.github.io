-- Daily challenge results
CREATE TABLE daily_challenge_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    score INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, challenge_date)
);

CREATE INDEX idx_daily_challenge_date ON daily_challenge_results(challenge_date);

ALTER TABLE daily_challenge_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own results" ON daily_challenge_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON daily_challenge_results FOR INSERT WITH CHECK (auth.uid() = user_id);
