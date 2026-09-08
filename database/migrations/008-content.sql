BEGIN;
CREATE TABLE client_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid REFERENCES stores(id), platform varchar(32) NOT NULL CHECK(platform IN ('miniapp','app')), app_id varchar(128),
 system_name varchar(120) NOT NULL, cover_file_id uuid REFERENCES files(id), welcome_text text, customer_service text, app_download_url text,
 enabled boolean NOT NULL DEFAULT false, extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT(store_id,platform)
);
CREATE TABLE client_content_blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), setting_id uuid NOT NULL REFERENCES client_settings(id), block_type varchar(32) NOT NULL CHECK(block_type IN ('text','banner','link','video')),
 title varchar(120), body text, file_id uuid REFERENCES files(id), link_url text, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0), enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(block_type NOT IN ('banner','video') OR file_id IS NOT NULL), CHECK(block_type<>'link' OR link_url IS NOT NULL)
);
CREATE TABLE app_promotions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 reward_type varchar(32) NOT NULL CHECK(reward_type IN ('coupon','points')), coupon_template_id uuid REFERENCES coupon_templates(id), point_amount integer CHECK(point_amount>0),
 status varchar(32) NOT NULL CHECK(status IN ('draft','active','inactive','expired')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at), CHECK((reward_type='coupon')=(coupon_template_id IS NOT NULL)), CHECK((reward_type='points')=(point_amount IS NOT NULL))
);
CREATE TABLE app_reward_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), promotion_id uuid NOT NULL REFERENCES app_promotions(id), member_id uuid NOT NULL REFERENCES members(id), client_device_id uuid REFERENCES client_devices(id),
 claimed_at timestamptz NOT NULL, member_coupon_id uuid REFERENCES member_coupons(id), point_ledger_id uuid REFERENCES point_ledger(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(promotion_id,member_id), CHECK(num_nonnulls(member_coupon_id,point_ledger_id)=1)
);
CREATE TABLE activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL, description text NOT NULL, cover_file_id uuid REFERENCES files(id),
 registration_starts_at timestamptz NOT NULL, registration_ends_at timestamptz NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 capacity integer CHECK(capacity>=0), status varchar(32) NOT NULL CHECK(status IN ('draft','published','closed','cancelled')), created_by uuid NOT NULL REFERENCES admin_accounts(id), extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(registration_starts_at<registration_ends_at AND registration_ends_at<=starts_at AND starts_at<ends_at)
);
CREATE TABLE activity_stores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES activities(id), store_id uuid NOT NULL REFERENCES stores(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(activity_id,store_id)
);
CREATE TABLE activity_registrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES activities(id), store_id uuid NOT NULL REFERENCES stores(id), member_id uuid NOT NULL REFERENCES members(id),
 status varchar(32) NOT NULL CHECK(status IN ('registered','cancelled','attended')), registered_at timestamptz NOT NULL, cancelled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(activity_id,member_id), FOREIGN KEY(activity_id,store_id) REFERENCES activity_stores(activity_id,store_id), CHECK(cancelled_at IS NULL OR cancelled_at>=registered_at)
);
CREATE TABLE franchise_brand (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL, introduction text NOT NULL, contact_phone varchar(32) NOT NULL, logo_file_id uuid REFERENCES files(id),
 status varchar(32) NOT NULL CHECK(status IN ('draft','published')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX franchise_brand_singleton ON franchise_brand((true));
CREATE TABLE franchise_models (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brand_id uuid NOT NULL REFERENCES franchise_brand(id), model_code varchar(64) NOT NULL, name varchar(120) NOT NULL, description text,
 area_sqm numeric(10,2) CHECK(area_sqm>=0), investment_description text, sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(brand_id,model_code)
);
CREATE TABLE franchise_model_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), model_id uuid NOT NULL REFERENCES franchise_models(id), file_id uuid NOT NULL REFERENCES files(id), sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(model_id,file_id)
);
CREATE TABLE franchise_inquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brand_id uuid NOT NULL REFERENCES franchise_brand(id), model_id uuid REFERENCES franchise_models(id), member_id uuid REFERENCES members(id),
 contact_name varchar(120) NOT NULL, phone varchar(32) NOT NULL, preferred_city varchar(120), message text, source varchar(32) NOT NULL CHECK(source IN ('miniapp','app','web')),
 status varchar(32) NOT NULL CHECK(status IN ('new','contacted','closed')), received_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX franchise_inquiries_status_idx ON franchise_inquiries(status,received_at DESC);
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), member_id uuid REFERENCES members(id), platform varchar(32) NOT NULL CHECK(platform IN ('miniapp','app')),
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), content text, anonymous boolean NOT NULL DEFAULT false, submitted_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_store_idx ON reviews(store_id,submitted_at DESC,id);
CREATE TABLE feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), platform varchar(32) NOT NULL CHECK(platform IN ('miniapp','app')), content text NOT NULL,
 category varchar(64), submitted_at timestamptz NOT NULL, status varchar(32) NOT NULL CHECK(status IN ('new','read','closed')), source_key varchar(255) UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_store_idx ON feedback(store_id,submitted_at DESC,id);
INSERT INTO schema_migrations(version,name) VALUES(8,'content');
COMMIT;
