BEGIN;
CREATE TABLE payment_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid REFERENCES stores(id), provider varchar(32) NOT NULL CHECK(provider IN ('wechat','alipay','bank')),
 merchant_id varchar(128) NOT NULL, account_name varchar(120) NOT NULL, account_masked varchar(64) NOT NULL, credential_secret_ref varchar(255),
 binding_status varchar(32) NOT NULL DEFAULT 'unbound' CHECK(binding_status IN ('unbound','pending','bound','failed')), external_account_id varchar(255), bound_at timestamptz,
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,merchant_id)
);
CREATE TABLE settlement_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), version integer NOT NULL CHECK(version>0),
 cycle_unit varchar(16) NOT NULL CHECK(cycle_unit IN ('day','week','month')), cycle_value integer NOT NULL CHECK(cycle_value BETWEEN 1 AND 365),
 effective_from date NOT NULL, effective_to date, status varchar(32) NOT NULL CHECK(status IN ('draft','active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store_id,version), CHECK(effective_to IS NULL OR effective_to>effective_from)
);
CREATE INDEX settlement_rules_effective_idx ON settlement_rules(store_id,effective_from,effective_to) WHERE status='active';
CREATE TABLE settlement_rule_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rule_id uuid NOT NULL REFERENCES settlement_rules(id), payment_account_id uuid NOT NULL REFERENCES payment_accounts(id),
 ratio numeric(7,6) NOT NULL CHECK(ratio BETWEEN 0 AND 1), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(rule_id,payment_account_id)
);
CREATE TABLE settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), rule_id uuid NOT NULL REFERENCES settlement_rules(id),
 base_amount numeric(14,2) NOT NULL CHECK(base_amount>=0), due_at timestamptz NOT NULL, status varchar(32) NOT NULL CHECK(status IN ('pending','processing','succeeded','failed','unknown')),
 rule_snapshot jsonb NOT NULL, source_key varchar(255) NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX settlements_due_idx ON settlements(status,due_at);
CREATE INDEX settlements_order_idx ON settlements(order_id);
CREATE TABLE settlement_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), settlement_id uuid NOT NULL REFERENCES settlements(id), payment_account_id uuid NOT NULL REFERENCES payment_accounts(id),
 ratio numeric(7,6) NOT NULL CHECK(ratio BETWEEN 0 AND 1), amount numeric(14,2) NOT NULL CHECK(amount>=0), provider_transfer_id varchar(255),
 status varchar(32) NOT NULL CHECK(status IN ('pending','processing','succeeded','failed','unknown')), settled_at timestamptz, failure_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(settlement_id,payment_account_id)
);
INSERT INTO schema_migrations(version, name) VALUES (9, 'settlement');
COMMIT;
