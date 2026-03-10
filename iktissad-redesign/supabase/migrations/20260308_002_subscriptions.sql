CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'paused', 'incomplete'
);
CREATE TYPE subscription_interval AS ENUM ('monthly', 'annual', 'quarterly');
CREATE TYPE discount_type AS ENUM ('percent', 'fixed');

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_annual NUMERIC(10,2),
  interval subscription_interval NOT NULL DEFAULT 'monthly',
  features JSONB DEFAULT '[]',
  features_ar JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  max_uses INT,
  uses_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  plans UUID[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  country_code TEXT,
  plan_id UUID REFERENCES subscription_plans(id),
  status subscription_status DEFAULT 'incomplete',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  payment_method JSONB,
  gateway_customer_id TEXT,
  gateway_subscription_id TEXT,
  promo_code_id UUID REFERENCES promo_codes(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL,
  gateway_payment_id TEXT,
  description TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_plan ON subscribers(plan_id);
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_created ON subscribers(created_at DESC);
CREATE INDEX idx_payments_subscriber ON payments(subscriber_id);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_plans" ON subscription_plans FOR SELECT USING (is_active = true);
