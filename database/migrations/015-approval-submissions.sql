BEGIN;

INSERT INTO permissions (code, name, module)
VALUES ('approvals:create', '审批 · 发起审批', 'approvals') ON CONFLICT (code) DO NOTHING;
-- Existing built-in roles can submit requests; processing permissions remain separate.
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id FROM roles CROSS JOIN permissions
WHERE roles.code IN ('hq', 'store') AND permissions.code = 'approvals:create'
ON CONFLICT DO NOTHING;

ALTER TABLE files DROP CONSTRAINT files_category_check;
ALTER TABLE files ADD CONSTRAINT files_category_check
  CHECK (category IN ('image', 'video', 'contract', 'body_report', 'face', 'model', 'approval'));

ALTER TABLE approval_instances
  ADD COLUMN source_type varchar(32),
  ADD COLUMN source_id uuid,
  ADD COLUMN business_key text,
  ADD COLUMN created_by uuid REFERENCES admin_accounts(id),
  ADD COLUMN request_key varchar(128),
  ADD COLUMN request_digest text,
  ADD CONSTRAINT approval_request_unique UNIQUE(created_by, request_key);

CREATE UNIQUE INDEX approval_pending_business_unique ON approval_instances(business_key)
  WHERE status = 'pending' AND business_type <> 'other_configured';

CREATE TABLE approval_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES approval_instances(id),
  file_id uuid NOT NULL REFERENCES files(id),
  original_name varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instance_id, file_id)
);

COMMIT;
