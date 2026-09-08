BEGIN;
CREATE TABLE point_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rule_key uuid NOT NULL, version integer NOT NULL CHECK(version>0), name varchar(120) NOT NULL,
 event_type varchar(32) NOT NULL CHECK(event_type IN ('checkin','consumption','invitation')), threshold_amount numeric(14,2) CHECK(threshold_amount>0), points integer NOT NULL CHECK(points>=0),
 daily_limit integer CHECK(daily_limit>=0), effective_from timestamptz NOT NULL, effective_to timestamptz,
 status varchar(32) NOT NULL CHECK(status IN ('draft','active','inactive')), extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(rule_key,version), CHECK(effective_to IS NULL OR effective_to>effective_from), CHECK((event_type='consumption')=(threshold_amount IS NOT NULL))
);
CREATE TABLE point_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL UNIQUE REFERENCES members(id), balance integer NOT NULL DEFAULT 0 CHECK(balance>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE point_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), rule_id uuid REFERENCES point_rules(id), store_id uuid REFERENCES stores(id),
 delta integer NOT NULL, balance_after integer NOT NULL CHECK(balance_after>=0), event_type varchar(32) NOT NULL CHECK(event_type IN ('checkin','consumption','invitation','redemption','gift','refund','app_reward')),
 source_id uuid, source_key varchar(255) NOT NULL UNIQUE, occurred_at timestamptz NOT NULL, extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX point_ledger_member_idx ON point_ledger(member_id,occurred_at DESC,id);
CREATE TABLE point_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL, kind varchar(32) NOT NULL CHECK(kind IN ('card','course','merchandise')),
 card_template_id uuid REFERENCES card_templates(id), course_product_id uuid REFERENCES course_products(id), file_id uuid REFERENCES files(id),
 points_price integer NOT NULL CHECK(points_price>0), stock integer CHECK(stock>=0), status varchar(32) NOT NULL CHECK(status IN ('active','inactive')),
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='card')=(card_template_id IS NOT NULL)), CHECK((kind='course')=(course_product_id IS NOT NULL))
);
ALTER TABLE order_items ADD CONSTRAINT order_items_point_product_fk FOREIGN KEY(point_product_id) REFERENCES point_products(id);
CREATE TABLE point_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id), product_id uuid NOT NULL REFERENCES point_products(id),
 quantity integer NOT NULL CHECK(quantity>0), points_spent integer NOT NULL CHECK(points_spent>0), order_id uuid REFERENCES orders(id), member_card_id uuid REFERENCES member_cards(id), member_course_pack_id uuid REFERENCES member_course_packs(id),
 status varchar(32) NOT NULL CHECK(status IN ('pending','completed','cancelled','shipping','delivered')), delivery_snapshot jsonb, source_key varchar(255) NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inviter_id uuid NOT NULL REFERENCES members(id), invitee_id uuid NOT NULL UNIQUE REFERENCES members(id), code varchar(128) NOT NULL,
 registered_at timestamptz NOT NULL, qualified_at timestamptz, reward_ledger_id uuid REFERENCES point_ledger(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK(inviter_id<>invitee_id)
);
CREATE TABLE share_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), channel varchar(32) NOT NULL, scene_type varchar(32) NOT NULL, scene_id uuid,
 shared_at timestamptz NOT NULL, source_key varchar(255) NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coupon_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL, kind varchar(32) NOT NULL CHECK(kind IN ('amount','rate')),
 discount_amount numeric(14,2) CHECK(discount_amount>0), discount_rate numeric(7,6) CHECK(discount_rate>0 AND discount_rate<1), minimum_spend numeric(14,2) NOT NULL CHECK(minimum_spend>=0),
 starts_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, total_limit bigint CHECK(total_limit>0), allocated_count bigint NOT NULL DEFAULT 0, issued_count bigint NOT NULL DEFAULT 0,
 per_member_limit integer NOT NULL CHECK(per_member_limit>0), applicable_product_type varchar(32) CHECK(applicable_product_type IN ('card','course','all')),
 scope varchar(32) NOT NULL CHECK(scope IN ('all','selected')), status varchar(32) NOT NULL CHECK(status IN ('active','inactive')), extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(expires_at>starts_at),
 CHECK(issued_count>=0 AND issued_count<=allocated_count AND (total_limit IS NULL OR allocated_count<=total_limit)),
 CHECK((kind='amount')=(discount_amount IS NOT NULL)), CHECK((kind='rate')=(discount_rate IS NOT NULL))
);
CREATE TABLE coupon_template_stores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES coupon_templates(id), store_id uuid NOT NULL REFERENCES stores(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(template_id,store_id)
);
CREATE TABLE coupon_store_quotas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES coupon_templates(id), store_id uuid NOT NULL REFERENCES stores(id),
 allocated_count bigint NOT NULL DEFAULT 0 CHECK(allocated_count>=0), reserved_count bigint NOT NULL DEFAULT 0 CHECK(reserved_count>=0), issued_count bigint NOT NULL DEFAULT 0 CHECK(issued_count>=0),
 status varchar(32) NOT NULL CHECK(status IN ('active','inactive')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(template_id,store_id), UNIQUE(id,store_id), CHECK(issued_count+reserved_count<=allocated_count)
);
CREATE TABLE coupon_quota_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES coupon_templates(id), created_by uuid NOT NULL REFERENCES admin_accounts(id),
 target_mode varchar(32) NOT NULL CHECK(target_mode IN ('selected','all_eligible')), selector_snapshot jsonb NOT NULL, quantity_per_store integer NOT NULL CHECK(quantity_per_store>0),
 target_count integer NOT NULL CHECK(target_count>0), total_quantity bigint NOT NULL CHECK(total_quantity>0), request_key varchar(128) NOT NULL, request_digest varchar(64) NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('queued','running','succeeded','completed','failed')), completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(created_by,request_key), CHECK(total_quantity=quantity_per_store::bigint*target_count)
);
CREATE TABLE coupon_quota_batch_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES coupon_quota_batches(id), store_id uuid NOT NULL REFERENCES stores(id), quantity integer NOT NULL CHECK(quantity>0),
 status varchar(32) NOT NULL CHECK(status IN ('queued','succeeded','failed')), failure_reason text, processed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(batch_id,store_id)
);
CREATE TABLE coupon_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES coupon_templates(id), created_by uuid NOT NULL REFERENCES admin_accounts(id),
 request_key varchar(128) NOT NULL, request_digest varchar(64) NOT NULL, recipient_count integer NOT NULL CHECK(recipient_count BETWEEN 1 AND 500),
 status varchar(32) NOT NULL CHECK(status IN ('queued','running','succeeded','completed','failed')), completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(created_by,request_key)
);
CREATE TABLE coupon_batch_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES coupon_batches(id), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id), quota_id uuid NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('queued','succeeded','failed')), failure_reason text, processed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(batch_id,member_id), FOREIGN KEY(quota_id,store_id) REFERENCES coupon_store_quotas(id,store_id), FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id)
);
CREATE TABLE coupon_quota_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quota_id uuid NOT NULL REFERENCES coupon_store_quotas(id), allocation_item_id uuid REFERENCES coupon_quota_batch_items(id), recipient_id uuid REFERENCES coupon_batch_recipients(id),
 action varchar(32) NOT NULL CHECK(action IN ('allocate','reserve','issue','release')), allocated_delta bigint NOT NULL DEFAULT 0, reserved_delta bigint NOT NULL DEFAULT 0, issued_delta bigint NOT NULL DEFAULT 0,
 source_key varchar(255) NOT NULL UNIQUE, occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((action='allocate')=(allocation_item_id IS NOT NULL)), CHECK((action<>'allocate')=(recipient_id IS NOT NULL))
);
CREATE INDEX coupon_quota_ledger_time_idx ON coupon_quota_ledger(quota_id,occurred_at DESC,id);
CREATE TABLE member_coupons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES coupon_templates(id), batch_id uuid NOT NULL REFERENCES coupon_batches(id), member_id uuid NOT NULL REFERENCES members(id), issued_store_id uuid NOT NULL REFERENCES stores(id),
 coupon_no varchar(64) NOT NULL UNIQUE, terms_snapshot jsonb NOT NULL, status varchar(32) NOT NULL CHECK(status IN ('available','used','expired','revoked')),
 issued_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, used_order_id uuid REFERENCES orders(id), used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(batch_id,member_id), CHECK(expires_at>issued_at)
);
CREATE INDEX member_coupons_member_idx ON member_coupons(member_id,status,expires_at);
CREATE TABLE gift_code_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL, reward_type varchar(32) NOT NULL CHECK(reward_type IN ('card','course','points')),
 card_template_id uuid REFERENCES card_templates(id), course_product_id uuid REFERENCES course_products(id), point_amount integer CHECK(point_amount>0), count integer NOT NULL CHECK(count BETWEEN 1 AND 1000),
 expires_at timestamptz NOT NULL, created_by uuid NOT NULL REFERENCES admin_accounts(id), request_key varchar(128) NOT NULL, request_digest varchar(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(created_by,request_key),
 CHECK((reward_type='card')=(card_template_id IS NOT NULL)), CHECK((reward_type='course')=(course_product_id IS NOT NULL)), CHECK((reward_type='points')=(point_amount IS NOT NULL))
);
CREATE TABLE gift_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES gift_code_batches(id), code_digest varchar(64) NOT NULL UNIQUE, code_masked varchar(64) NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('available','redeemed','expired','revoked')), redeemed_by uuid REFERENCES members(id), redeemed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK((status='redeemed')=(redeemed_by IS NOT NULL AND redeemed_at IS NOT NULL))
);
CREATE TABLE gift_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gift_code_id uuid NOT NULL UNIQUE REFERENCES gift_codes(id), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 member_card_id uuid REFERENCES member_cards(id), member_course_pack_id uuid REFERENCES member_course_packs(id), point_ledger_id uuid REFERENCES point_ledger(id), redeemed_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(member_card_id,member_course_pack_id,point_ledger_id)=1)
);
CREATE TABLE message_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid REFERENCES stores(id), created_by uuid REFERENCES admin_accounts(id), kind varchar(32) NOT NULL CHECK(kind IN ('private','bulk','contract_reminder','maintenance','entry','expiry')),
 channel varchar(32) NOT NULL CHECK(channel IN ('sms','miniapp','app')), title varchar(120), content text NOT NULL, scheduled_at timestamptz,
 status varchar(32) NOT NULL CHECK(status IN ('queued','sending','sent','completed','failed','cancelled')), request_key varchar(128) NOT NULL, request_digest varchar(64),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT(created_by,request_key)
);
CREATE TABLE message_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES message_batches(id), store_id uuid REFERENCES stores(id), member_id uuid REFERENCES members(id), employee_id uuid REFERENCES employees(id), client_device_id uuid REFERENCES client_devices(id),
 status varchar(32) NOT NULL CHECK(status IN ('queued','sent','delivered','failed','unknown')), provider_message_id varchar(255), sent_at timestamptz, delivered_at timestamptz, read_at timestamptz, failure_reason text,
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0), next_attempt_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(member_id,employee_id)=1), UNIQUE(batch_id,member_id), UNIQUE(batch_id,employee_id)
);
CREATE TABLE notification_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), event_type varchar(32) NOT NULL, audience varchar(32) NOT NULL CHECK(audience IN ('manager','responsible_coach')),
 enabled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store_id,event_type,audience)
);
CREATE TABLE expiry_reminders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), member_card_id uuid REFERENCES member_cards(id), member_course_pack_id uuid REFERENCES member_course_packs(id),
 days_before integer NOT NULL CHECK(days_before>=0), channel varchar(32) NOT NULL, scheduled_at timestamptz NOT NULL, shown_at timestamptz, message_batch_id uuid REFERENCES message_batches(id),
 status varchar(32) NOT NULL CHECK(status IN ('queued','shown','sent','failed','cancelled')), created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(member_card_id,member_course_pack_id)=1),
 UNIQUE(member_card_id,days_before,channel), UNIQUE(member_course_pack_id,days_before,channel)
);
ALTER TABLE contract_reminders ADD CONSTRAINT contract_reminders_message_fk FOREIGN KEY(message_batch_id) REFERENCES message_batches(id);
INSERT INTO schema_migrations(version,name) VALUES(7,'marketing');
COMMIT;
