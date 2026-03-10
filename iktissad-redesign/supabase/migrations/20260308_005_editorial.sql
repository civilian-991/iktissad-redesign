CREATE TABLE article_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('writer', 'editor', 'photographer', 'designer')),
  due_date TIMESTAMPTZ,
  note TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES users(id)
);

CREATE TABLE article_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  parent_id UUID REFERENCES comments(id),
  body TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'spam')) DEFAULT 'pending',
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_article ON comments(article_id);
ALTER TABLE comments REPLICA IDENTITY FULL;
