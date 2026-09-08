BEGIN;
CREATE TABLE online_sales_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL UNIQUE REFERENCES stores(id), enabled boolean NOT NULL DEFAULT false,
 maintenance_message text, contract_required boolean NOT NULL DEFAULT true, status varchar(32) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE online_card_offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), card_template_id uuid NOT NULL REFERENCES card_templates(id),
 sale_price numeric(14,2) NOT NULL CHECK(sale_price>=0), starts_at timestamptz, ends_at timestamptz, enabled boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store_id,card_template_id), CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);
CREATE TABLE subscription_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), card_template_id uuid NOT NULL REFERENCES card_templates(id),
 price numeric(14,2) NOT NULL CHECK(price>=0), billing_day integer CHECK(billing_day BETWEEN 1 AND 28), renewal_notice_days integer NOT NULL CHECK(renewal_notice_days>=0),
 grace_days integer NOT NULL CHECK(grace_days>=0), enabled boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store_id,card_template_id)
);
CREATE TABLE verification_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL UNIQUE REFERENCES stores(id), enabled boolean NOT NULL DEFAULT false,
 require_checkin boolean NOT NULL DEFAULT true, supported_channels jsonb NOT NULL DEFAULT '[]', allowed_start time, allowed_end time,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(jsonb_typeof(supported_channels)='array')
);
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_no varchar(64) NOT NULL UNIQUE, member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 channel varchar(32) NOT NULL CHECK(channel IN ('web','miniapp','app','group_buy','gift','points')), status varchar(32) NOT NULL CHECK(status IN ('pending','paid','partially_refunded','refunded','cancelled','closed')),
 currency char(3) NOT NULL DEFAULT 'CNY', total_amount numeric(14,2) NOT NULL CHECK(total_amount>=0), discount_amount numeric(14,2) NOT NULL CHECK(discount_amount>=0),
 payable_amount numeric(14,2) NOT NULL CHECK(payable_amount>=0), paid_amount numeric(14,2) NOT NULL CHECK(paid_amount>=0), refunded_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(refunded_amount>=0),
 ordered_at timestamptz NOT NULL, paid_at timestamptz, source_key varchar(255) UNIQUE, extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(payable_amount=total_amount-discount_amount), CHECK(paid_amount<=payable_amount AND refunded_amount<=paid_amount),
 FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id)
);
CREATE INDEX orders_store_paid_idx ON orders(store_id,paid_at DESC,id);
CREATE INDEX orders_member_idx ON orders(member_id,ordered_at DESC);
CREATE TABLE order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id),
 product_type varchar(32) NOT NULL CHECK(product_type IN ('card','course','point_product')), card_template_id uuid REFERENCES card_templates(id), course_product_id uuid REFERENCES course_products(id), point_product_id uuid,
 product_name_snapshot varchar(255) NOT NULL, quantity integer NOT NULL CHECK(quantity>0), unit_price numeric(14,2) NOT NULL CHECK(unit_price>=0),
 discount_amount numeric(14,2) NOT NULL CHECK(discount_amount>=0), payable_amount numeric(14,2) NOT NULL CHECK(payable_amount>=0), product_snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(payable_amount=quantity*unit_price-discount_amount),
 CHECK(num_nonnulls(card_template_id,course_product_id,point_product_id)=1),
 CHECK((product_type='card')=(card_template_id IS NOT NULL)), CHECK((product_type='course')=(course_product_id IS NOT NULL)), CHECK((product_type='point_product')=(point_product_id IS NOT NULL))
);
CREATE INDEX order_items_order_idx ON order_items(order_id);
CREATE TABLE performance_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_item_id uuid NOT NULL REFERENCES order_items(id), employee_id uuid NOT NULL REFERENCES employees(id), store_id uuid NOT NULL REFERENCES stores(id),
 share_ratio numeric(7,6) NOT NULL CHECK(share_ratio BETWEEN 0 AND 1), amount numeric(14,2) NOT NULL CHECK(amount>=0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_item_id,employee_id)
);
CREATE INDEX performance_employee_idx ON performance_allocations(store_id,employee_id);
CREATE TABLE payment_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), provider varchar(64) NOT NULL, merchant_id varchar(128) NOT NULL,
 provider_transaction_id varchar(255), attempt_no integer NOT NULL CHECK(attempt_no>0), amount numeric(14,2) NOT NULL CHECK(amount>=0),
 status varchar(32) NOT NULL CHECK(status IN ('pending','succeeded','failed','closed')), paid_at timestamptz, failure_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,merchant_id,provider_transaction_id), UNIQUE(order_id,attempt_no)
);
CREATE TABLE refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_transaction_id uuid NOT NULL REFERENCES payment_transactions(id), refund_no varchar(64) NOT NULL UNIQUE,
 provider_refund_id varchar(255), amount numeric(14,2) NOT NULL CHECK(amount>0), status varchar(32) NOT NULL CHECK(status IN ('pending','succeeded','failed')),
 refunded_at timestamptz, reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(payment_transaction_id,provider_refund_id)
);
CREATE TABLE subscription_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id), setting_id uuid NOT NULL REFERENCES subscription_settings(id),
 member_card_id uuid REFERENCES member_cards(id), provider varchar(64) NOT NULL, external_agreement_id varchar(255) NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('active','cancelled','expired','suspended')), signed_at timestamptz NOT NULL, cancelled_at timestamptz, next_charge_at timestamptz,
 terms_snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,external_agreement_id)
);
CREATE INDEX subscription_agreements_store_idx ON subscription_agreements(store_id,status);
CREATE TABLE subscription_cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agreement_id uuid NOT NULL REFERENCES subscription_agreements(id), period_start timestamptz NOT NULL, period_end timestamptz NOT NULL,
 order_id uuid REFERENCES orders(id), amount numeric(14,2) NOT NULL CHECK(amount>=0), status varchar(32) NOT NULL CHECK(status IN ('pending','paid','failed','cancelled')),
 charged_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(agreement_id,period_start), CHECK(period_end>period_start)
);
CREATE TABLE external_vouchers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider varchar(64) NOT NULL, code_digest varchar(255) NOT NULL, code_masked varchar(128) NOT NULL, member_id uuid REFERENCES members(id),
 store_id uuid NOT NULL REFERENCES stores(id), external_order_no varchar(255), product_snapshot jsonb NOT NULL, expires_at timestamptz,
 status varchar(32) NOT NULL CHECK(status IN ('pending','available','used','expired','revoked')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,code_digest)
);
CREATE TABLE verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), member_id uuid NOT NULL REFERENCES members(id),
 type varchar(32) NOT NULL CHECK(type IN ('external_voucher','member_card','lesson')), external_voucher_id uuid REFERENCES external_vouchers(id), member_card_id uuid REFERENCES member_cards(id), lesson_record_id uuid REFERENCES lesson_records(id),
 source_key varchar(255) NOT NULL UNIQUE, device_id uuid REFERENCES devices(id), channel varchar(32) NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('succeeded','failed')), verified_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(external_voucher_id,member_card_id,lesson_record_id)=1),
 CHECK((type='external_voucher')=(external_voucher_id IS NOT NULL)), CHECK((type='member_card')=(member_card_id IS NOT NULL)), CHECK((type='lesson')=(lesson_record_id IS NOT NULL))
);
CREATE INDEX verifications_store_time_idx ON verifications(store_id,verified_at DESC,id);
CREATE TABLE card_usage_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_card_id uuid NOT NULL REFERENCES member_cards(id), store_id uuid NOT NULL REFERENCES stores(id),
 checkin_id uuid REFERENCES checkins(id), verification_id uuid REFERENCES verifications(id), delta_uses integer NOT NULL,
 source_key varchar(255) NOT NULL UNIQUE, occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(checkin_id,verification_id)=1)
);
CREATE INDEX card_usage_store_time_idx ON card_usage_records(store_id,occurred_at DESC,id);
CREATE TABLE member_debts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id), order_id uuid REFERENCES orders(id),
 amount numeric(14,2) NOT NULL CHECK(amount>=0), outstanding_amount numeric(14,2) NOT NULL, due_at timestamptz NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('outstanding','settled','cancelled')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(outstanding_amount BETWEEN 0 AND amount)
);
ALTER TABLE member_cards ADD CONSTRAINT member_cards_order_item_fk FOREIGN KEY(order_item_id) REFERENCES order_items(id);
ALTER TABLE member_course_packs ADD CONSTRAINT course_packs_order_item_fk FOREIGN KEY(order_item_id) REFERENCES order_items(id);
ALTER TABLE contracts ADD CONSTRAINT contracts_order_fk FOREIGN KEY(order_id) REFERENCES orders(id);
INSERT INTO schema_migrations(version,name) VALUES(6,'sales');
COMMIT;
