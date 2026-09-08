BEGIN;
CREATE TABLE salary_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_key uuid NOT NULL, version integer NOT NULL CHECK(version>0), name varchar(120) NOT NULL,
 base_salary numeric(14,2) NOT NULL CHECK(base_salary>=0), effective_from date NOT NULL, effective_to date, status varchar(32) NOT NULL CHECK(status IN ('draft','published')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(template_key,version), CHECK(effective_to IS NULL OR effective_to>effective_from)
);
CREATE TABLE salary_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES salary_templates(id), component varchar(32) NOT NULL CHECK(component IN ('card_sales','pt_sales','lessons','allowance','deduction')),
 calculation_type varchar(32) NOT NULL CHECK(calculation_type IN ('rate','per_unit','fixed')), rate numeric(7,6) CHECK(rate BETWEEN 0 AND 1), unit_amount numeric(14,2) CHECK(unit_amount>=0), fixed_amount numeric(14,2) CHECK(fixed_amount>=0),
 lower_bound numeric(14,2) CHECK(lower_bound>=0), upper_bound numeric(14,2), sort_order integer NOT NULL CHECK(sort_order>=0), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(upper_bound IS NULL OR upper_bound>COALESCE(lower_bound,0)),
 CHECK((component IN ('card_sales','pt_sales') AND calculation_type='rate' AND rate IS NOT NULL AND unit_amount IS NULL AND fixed_amount IS NULL)
 OR (component='lessons' AND calculation_type='per_unit' AND unit_amount IS NOT NULL AND rate IS NULL AND fixed_amount IS NULL AND lower_bound IS NULL AND upper_bound IS NULL)
 OR (component IN ('allowance','deduction') AND calculation_type='fixed' AND fixed_amount IS NOT NULL AND rate IS NULL AND unit_amount IS NULL AND lower_bound IS NULL AND upper_bound IS NULL))
);
CREATE INDEX salary_rules_template_idx ON salary_rules(template_id,sort_order);
CREATE TABLE employee_salary_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES employees(id), store_id uuid NOT NULL REFERENCES stores(id), template_id uuid NOT NULL REFERENCES salary_templates(id),
 effective_from date NOT NULL, effective_to date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(effective_to IS NULL OR effective_to>effective_from)
);
CREATE INDEX employee_salary_assignments_effective_idx ON employee_salary_assignments(store_id,employee_id,effective_from,effective_to);
CREATE TABLE payroll_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), period_month date NOT NULL CHECK(EXTRACT(day FROM period_month)=1), status varchar(32) NOT NULL CHECK(status IN ('draft','calculated','confirmed')),
 calculated_by uuid REFERENCES admin_accounts(id), calculated_at timestamptz, confirmed_by uuid REFERENCES admin_accounts(id), confirmed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store_id,period_month),
 CHECK(status='draft' OR (calculated_by IS NOT NULL AND calculated_at IS NOT NULL)), CHECK(status<>'confirmed' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL))
);
CREATE TABLE payroll_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES payroll_runs(id), employee_id uuid NOT NULL REFERENCES employees(id), template_id uuid NOT NULL REFERENCES salary_templates(id),
 base_salary numeric(14,2) NOT NULL CHECK(base_salary>=0), card_commission numeric(14,2) NOT NULL, pt_commission numeric(14,2) NOT NULL, lesson_commission numeric(14,2) NOT NULL,
 allowances numeric(14,2) NOT NULL, deductions numeric(14,2) NOT NULL, gross_amount numeric(14,2) NOT NULL, net_amount numeric(14,2) NOT NULL, calculation_snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(run_id,employee_id),
 CHECK(gross_amount=base_salary+card_commission+pt_commission+lesson_commission+allowances), CHECK(net_amount=gross_amount-deductions)
);
CREATE TABLE payroll_components (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payroll_item_id uuid NOT NULL REFERENCES payroll_items(id), rule_id uuid REFERENCES salary_rules(id),
 type varchar(32) NOT NULL CHECK(type IN ('card_sales','pt_sales','lessons','allowance','deduction')), label varchar(120) NOT NULL, basis_amount numeric(14,2), basis_quantity numeric(12,3),
 rate numeric(7,6) CHECK(rate BETWEEN 0 AND 1), amount numeric(14,2) NOT NULL, source_snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payroll_components_item_idx ON payroll_components(payroll_item_id);
CREATE TABLE background_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind varchar(64) NOT NULL CHECK(kind IN ('coupon_quota','coupon_issue','message_batch','contract_reminder','payroll_calculation','device_command')),
 resource_id uuid NOT NULL, status varchar(32) NOT NULL CHECK(status IN ('queued','running','succeeded','failed','unknown')), available_at timestamptz NOT NULL DEFAULT now(),
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0), max_attempts integer NOT NULL CHECK(max_attempts>0), lease_owner varchar(255), lease_token uuid, lease_until timestamptz,
 last_error text, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,resource_id),
 CHECK(status<>'running' OR (lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX background_jobs_claim_idx ON background_jobs(status,available_at,lease_until);
INSERT INTO schema_migrations(version,name) VALUES (10,'payroll-jobs');
COMMIT;
