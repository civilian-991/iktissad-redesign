CREATE TABLE article_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  time_on_page INT DEFAULT 0,
  scroll_depth NUMERIC(5,2) DEFAULT 0,
  read_through BOOLEAN DEFAULT false,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE magazine_spread_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES magazine_issues(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  spread_number INT NOT NULL,
  dwell_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_article_reads_article ON article_reads(article_id);
CREATE INDEX idx_article_reads_session ON article_reads(session_id);
CREATE INDEX idx_article_reads_created ON article_reads(created_at DESC);
