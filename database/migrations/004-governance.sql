BEGIN;
CREATE TABLE contract_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_key uuid NOT NULL, version integer NOT NULL CHECK(version>0), name varchar(120) NOT NULL,
 file_id uuid NOT NULL REFERENCES files(id), applicable_type varchar(32) NOT NULL CHECK(applicable_type IN ('card','course')),
 reminder_days integer NOT NULL CHECK(reminder_days BETWEEN 0 AND 365), status varchar(32) NOT NULL CHECK(status IN ('draft','published','inactive')),
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(template_key,version)
);
CREATE TABLE contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_no varchar(64) NOT NULL UNIQUE, member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 template_id uuid NOT NULL REFERENCES contract_templates(id), order_id uuid, member_card_id uuid REFERENCES member_cards(id), member_course_pack_id uuid REFERENCES member_course_packs(id),
 unsigned_file_id uuid NOT NULL REFERENCES files(id), signed_file_id uuid REFERENCES files(id),
 status varchar(32) NOT NULL CHECK(status IN ('unsigned','sent','viewed','signed','cancelled','expired')), sent_at timestamptz, due_at timestamptz, signed_at timestamptz,
 sign_ip inet, sign_user_agent text, sign_device_uid varchar(255), provider varchar(64), provider_contract_id varchar(255),
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'signed' OR (signed_at IS NOT NULL AND signed_file_id IS NOT NULL)),
 UNIQUE(provider,provider_contract_id), FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id)
);
CREATE INDEX contracts_store_idx ON contracts(store_id,status,due_at);
CREATE TABLE contract_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES contracts(id), type varchar(32) NOT NULL, occurred_at timestamptz NOT NULL,
 ip inet, device_uid varchar(255), user_agent text, signer_member_id uuid REFERENCES members(id), provider_event_id varchar(255), evidence_file_id uuid REFERENCES files(id),
 payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(contract_id,provider_event_id)
);
CREATE INDEX contract_events_time_idx ON contract_events(contract_id,occurred_at);
CREATE TABLE contract_reminders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES contracts(id), message_batch_id uuid,
 scheduled_at timestamptz NOT NULL, sent_at timestamptz, status varchar(32) NOT NULL CHECK(status IN ('queued','sent','failed','cancelled')),
 source_key varchar(255) NOT NULL UNIQUE, failure_reason text, created_by uuid REFERENCES admin_accounts(id),
 channel varchar(32) NOT NULL, content text, request_key varchar(128), request_digest varchar(255),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(created_by,request_key)
);
CREATE TABLE approval_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_key uuid NOT NULL, version integer NOT NULL CHECK(version>0), name varchar(120) NOT NULL,
 business_type varchar(32) NOT NULL CHECK(business_type IN ('price_change','contract','other_configured')), status varchar(32) NOT NULL CHECK(status IN ('draft','published','inactive')),
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(template_key,version)
);
CREATE TABLE approval_template_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES approval_templates(id), step_no integer NOT NULL CHECK(step_no BETWEEN 1 AND 20),
 approver_role_id uuid REFERENCES roles(id), approver_employee_id uuid REFERENCES employees(id), decision_mode varchar(32) NOT NULL DEFAULT 'single' CHECK(decision_mode='single'),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(approver_role_id,approver_employee_id)=1), UNIQUE(template_id,step_no)
);
CREATE TABLE approval_instances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES approval_templates(id), store_id uuid NOT NULL REFERENCES stores(id),
 applicant_employee_id uuid NOT NULL REFERENCES employees(id), business_type varchar(32) NOT NULL CHECK(business_type IN ('price_change','contract','other_configured')),
 business_id uuid, title varchar(255) NOT NULL, request_snapshot jsonb NOT NULL, status varchar(32) NOT NULL CHECK(status IN ('pending','approved','rejected','cancelled')),
 current_step integer NOT NULL CHECK(current_step>0), submitted_at timestamptz NOT NULL, completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(completed_at IS NULL OR completed_at>=submitted_at)
);
CREATE INDEX approval_instances_store_idx ON approval_instances(store_id,status,submitted_at DESC);
CREATE TABLE approval_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), instance_id uuid NOT NULL REFERENCES approval_instances(id), step_no integer NOT NULL CHECK(step_no>0),
 approver_employee_id uuid NOT NULL REFERENCES employees(id), status varchar(32) NOT NULL CHECK(status IN ('waiting','pending','approved','rejected','cancelled')),
 decision varchar(32) CHECK(decision IN ('approve','reject')), comment text, decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(instance_id,step_no),
 CHECK((status IN ('approved','rejected'))=(decision IS NOT NULL AND decided_at IS NOT NULL))
);
CREATE INDEX approval_tasks_assignee_idx ON approval_tasks(approver_employee_id,status);
CREATE TABLE price_change_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), approval_instance_id uuid NOT NULL UNIQUE REFERENCES approval_instances(id),
 course_product_id uuid NOT NULL REFERENCES course_products(id), product_link_id uuid REFERENCES product_links(id),
 original_price numeric(14,2) NOT NULL CHECK(original_price>=0), requested_price numeric(14,2) NOT NULL CHECK(requested_price>=0), reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE product_links ADD CONSTRAINT product_links_approval_fk FOREIGN KEY(approval_instance_id) REFERENCES approval_instances(id);
INSERT INTO schema_migrations(version,name) VALUES(4,'governance');
COMMIT;
