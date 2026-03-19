CREATE TABLE editorial_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES editorial_notes(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_editorial_notes_article ON editorial_notes(article_id);
CREATE INDEX idx_editorial_notes_parent ON editorial_notes(parent_id);
ALTER TABLE editorial_notes REPLICA IDENTITY FULL;
