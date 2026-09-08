BEGIN;
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_no varchar(64) NOT NULL UNIQUE,
  phone varchar(32) NOT NULL UNIQUE, name varchar(120), nickname varchar(120), avatar_file_id uuid REFERENCES files(id),
  gender varchar(32) CHECK (gender IN ('male','female','unspecified')), birthday date,
  registered_store_id uuid REFERENCES stores(id), source varchar(32) NOT NULL,
  customer_stage varchar(32) NOT NULL DEFAULT 'lead' CHECK (customer_stage IN ('lead','member')),
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  registered_at timestamptz NOT NULL DEFAULT now(), extra jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX members_registered_idx ON members(registered_store_id,registered_at DESC,id);
CREATE TABLE member_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id),
  store_id uuid NOT NULL REFERENCES stores(id), joined_at timestamptz NOT NULL DEFAULT now(), last_visit_at timestamptz,
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(member_id,store_id)
);
CREATE INDEX member_stores_store_idx ON member_stores(store_id,member_id);
CREATE TABLE member_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id),
  provider varchar(64) NOT NULL, app_id varchar(128) NOT NULL, openid varchar(128), unionid varchar(128), provider_subject varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,app_id,openid),
  CHECK (openid IS NOT NULL OR provider_subject IS NOT NULL)
);
CREATE INDEX member_identities_member_idx ON member_identities(member_id);
CREATE INDEX member_identities_union_idx ON member_identities(provider,unionid);
CREATE TABLE employee_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES employees(id),
  provider varchar(64) NOT NULL, app_id varchar(128) NOT NULL, openid varchar(128), unionid varchar(128), provider_subject varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,app_id,openid),
  CHECK (openid IS NOT NULL OR provider_subject IS NOT NULL)
);
CREATE TABLE member_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id),
  store_id uuid NOT NULL REFERENCES stores(id), employee_id uuid NOT NULL REFERENCES employees(id),
  assignment_type varchar(32) NOT NULL CHECK (assignment_type IN ('sales','coach')),
  assigned_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz, assigned_by uuid REFERENCES admin_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(), CHECK (ended_at IS NULL OR ended_at >= assigned_at),
  FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id)
);
CREATE UNIQUE INDEX member_current_assignment ON member_assignments(member_id,store_id,assignment_type) WHERE ended_at IS NULL;
CREATE TABLE lead_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id),
  store_id uuid NOT NULL REFERENCES stores(id), employee_id uuid NOT NULL REFERENCES employees(id),
  channel varchar(32) NOT NULL, content text NOT NULL, followed_at timestamptz NOT NULL, next_followup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id)
);
CREATE INDEX lead_followups_member_idx ON lead_followups(member_id,followed_at DESC);
CREATE TABLE card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_key uuid NOT NULL, version integer NOT NULL CHECK (version > 0),
  name varchar(120) NOT NULL, kind varchar(32) NOT NULL CHECK (kind IN ('period','count')),
  duration_days integer, included_uses integer, price numeric(14,2) NOT NULL CHECK (price >= 0), member_prefix varchar(120),
  access_scope varchar(32) NOT NULL CHECK (access_scope IN ('all','selected')),
  status varchar(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','inactive')),
  extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_key,version),
  CHECK ((kind='period' AND duration_days>0 AND included_uses IS NULL) OR (kind='count' AND included_uses>0 AND duration_days IS NULL))
);
CREATE TABLE card_template_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), card_template_id uuid NOT NULL REFERENCES card_templates(id),
  store_id uuid NOT NULL REFERENCES stores(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(card_template_id,store_id)
);
CREATE TABLE member_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id),
  card_template_id uuid NOT NULL REFERENCES card_templates(id), issued_store_id uuid NOT NULL REFERENCES stores(id),
  order_item_id uuid, card_no varchar(64) NOT NULL UNIQUE, display_prefix varchar(255) NOT NULL,
  starts_at timestamptz NOT NULL, expires_at timestamptz, total_uses integer, remaining_uses integer,
  status varchar(32) NOT NULL CHECK (status IN ('pending','active','frozen','expired','cancelled')),
  template_snapshot jsonb NOT NULL, extra jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > starts_at),
  CHECK ((total_uses IS NULL AND remaining_uses IS NULL) OR (total_uses IS NOT NULL AND remaining_uses IS NOT NULL AND total_uses>0 AND remaining_uses BETWEEN 0 AND total_uses))
);
CREATE INDEX member_cards_member_idx ON member_cards(member_id,created_at DESC);
CREATE INDEX member_cards_expiry_idx ON member_cards(status,expires_at);
CREATE TABLE member_card_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_card_id uuid NOT NULL REFERENCES member_cards(id),
  store_id uuid NOT NULL REFERENCES stores(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(member_card_id,store_id)
);
CREATE TABLE card_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_card_id uuid NOT NULL REFERENCES member_cards(id),
  from_status varchar(32) NOT NULL, to_status varchar(32) NOT NULL, reason text NOT NULL,
  source_type varchar(64) NOT NULL, source_id uuid, actor_id uuid REFERENCES admin_accounts(id),
  occurred_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version,name) VALUES (2,'members-and-cards');
COMMIT;
