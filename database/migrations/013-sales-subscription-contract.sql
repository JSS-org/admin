BEGIN;
ALTER TABLE subscription_settings ADD COLUMN contract_required boolean NOT NULL DEFAULT true;
INSERT INTO schema_migrations(version,name) VALUES(13,'sales-subscription-contract');
COMMIT;
