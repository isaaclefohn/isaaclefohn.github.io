-- Level progress tracking
CREATE TABLE level_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    stars INTEGER NOT NULL CHECK (stars BETWEEN 0 AND 3),
    high_score INTEGER NOT NULL DEFAULT 0,
    moves_used INTEGER,
    time_seconds INTEGER,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, level_number)
);

CREATE INDEX idx_level_progress_user ON level_progress(user_id);
CREATE INDEX idx_level_progress_level ON level_progress(level_number);

ALTER TABLE level_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON level_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON level_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON level_progress FOR UPDATE USING (auth.uid() = user_id);
