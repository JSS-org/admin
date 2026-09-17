BEGIN;
ALTER TABLE online_sales_settings DROP COLUMN enabled;
ALTER TABLE online_card_offers ADD COLUMN approval_required boolean NOT NULL DEFAULT false;
ALTER TABLE subscription_settings ADD COLUMN approval_required boolean NOT NULL DEFAULT false;
INSERT INTO schema_migrations(version,name) VALUES(11,'sales-approval');
COMMIT;
