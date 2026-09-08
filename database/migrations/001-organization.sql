BEGIN;

CREATE TABLE schema_migrations (
  version bigint PRIMARY KEY,
  name varchar(120) NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL UNIQUE,
  name varchar(120) NOT NULL CHECK (length(trim(name)) > 0),
  description text NOT NULL DEFAULT '',
  area_sqm numeric(10,2) NOT NULL DEFAULT 0 CHECK (area_sqm >= 0),
  features jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(features) = 'array'),
  province varchar(120), city varchar(120), district varchar(120),
  address varchar(500) NOT NULL,
  longitude numeric(10,7) CHECK (longitude BETWEEN -180 AND 180),
  latitude numeric(10,7) CHECK (latitude BETWEEN -90 AND 90),
  service_phone varchar(32), service_wechat varchar(128),
  business_hours jsonb NOT NULL DEFAULT '{}',
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  extra jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_no varchar(64) NOT NULL UNIQUE,
  name varchar(120) NOT NULL, phone varchar(32) NOT NULL, avatar_file_id uuid,
  job_title varchar(120), hired_on date NOT NULL, left_on date,
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  extra jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (left_on IS NULL OR left_on >= hired_on)
);
CREATE TABLE employee_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES employees(id),
  store_id uuid NOT NULL REFERENCES stores(id), is_primary boolean NOT NULL DEFAULT false,
  is_manager boolean NOT NULL DEFAULT false, joined_on date NOT NULL, ended_on date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_on IS NULL OR ended_on >= joined_on)
);
CREATE UNIQUE INDEX employee_current_store ON employee_stores(employee_id,store_id) WHERE ended_on IS NULL;
CREATE UNIQUE INDEX employee_primary_store ON employee_stores(employee_id) WHERE ended_on IS NULL AND is_primary;
CREATE INDEX employee_stores_store_idx ON employee_stores(store_id,employee_id);
CREATE TABLE admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid UNIQUE REFERENCES employees(id),
  username varchar(64) NOT NULL UNIQUE, password_hash text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  last_login_at timestamptz, failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(64) NOT NULL UNIQUE,
  name varchar(120) NOT NULL, scope_type varchar(32) NOT NULL CHECK (scope_type IN ('hq','store')),
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(120) NOT NULL UNIQUE,
  name varchar(120) NOT NULL, module varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), role_id uuid NOT NULL REFERENCES roles(id),
  permission_id uuid NOT NULL REFERENCES permissions(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id,permission_id)
);
CREATE INDEX role_permissions_permission_idx ON role_permissions(permission_id);
CREATE TABLE account_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES admin_accounts(id),
  role_id uuid NOT NULL REFERENCES roles(id), store_id uuid REFERENCES stores(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX account_global_role ON account_roles(account_id,role_id) WHERE store_id IS NULL;
CREATE UNIQUE INDEX account_store_role ON account_roles(account_id,role_id,store_id) WHERE store_id IS NOT NULL;
CREATE INDEX account_roles_role_idx ON account_roles(role_id);
CREATE INDEX account_roles_store_idx ON account_roles(store_id);
CREATE FUNCTION validate_account_role_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE role_scope varchar(32);
BEGIN
  SELECT scope_type INTO role_scope FROM roles WHERE id=NEW.role_id;
  IF (role_scope='hq' AND NEW.store_id IS NOT NULL) OR (role_scope='store' AND NEW.store_id IS NULL) THEN
    RAISE EXCEPTION 'Role scope and store must agree' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER account_role_scope BEFORE INSERT OR UPDATE ON account_roles FOR EACH ROW EXECUTE FUNCTION validate_account_role_scope();
CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES admin_accounts(id),
  token_digest varchar(128) NOT NULL UNIQUE, refresh_digest varchar(128) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL, refresh_expires_at timestamptz NOT NULL, revoked_at timestamptz,
  ip inet, user_agent text, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (refresh_expires_at >= expires_at)
);
CREATE INDEX admin_sessions_account_idx ON admin_sessions(account_id);
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid REFERENCES stores(id),
  uploaded_by uuid REFERENCES admin_accounts(id), storage_key text NOT NULL UNIQUE,
  original_name varchar(255) NOT NULL, mime_type varchar(120) NOT NULL, byte_size bigint NOT NULL CHECK (byte_size >= 0),
  category varchar(32) NOT NULL CHECK (category IN ('image','video','contract','body_report','face','model')),
  visibility varchar(32) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  status varchar(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX files_store_idx ON files(store_id,created_at DESC);
ALTER TABLE employees ADD CONSTRAINT employee_avatar_fk FOREIGN KEY(avatar_file_id) REFERENCES files(id);
CREATE TABLE store_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id),
  file_id uuid NOT NULL REFERENCES files(id), caption text, is_cover boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id,file_id)
);
CREATE UNIQUE INDEX store_single_cover ON store_media(store_id) WHERE is_cover;
CREATE TABLE operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES admin_accounts(id),
  store_id uuid REFERENCES stores(id), action varchar(120) NOT NULL, resource_type varchar(64) NOT NULL,
  resource_id uuid, summary jsonb NOT NULL DEFAULT '{}', ip inet,
  occurred_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX operation_logs_store_time_idx ON operation_logs(store_id,occurred_at DESC);
INSERT INTO schema_migrations(version,name) VALUES (1,'organization');
COMMIT;
