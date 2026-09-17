BEGIN;
ALTER TABLE online_sales_settings DROP COLUMN contract_required;
ALTER TABLE online_card_offers ADD COLUMN contract_required boolean NOT NULL DEFAULT true;
INSERT INTO schema_migrations(version,name) VALUES(12,'sales-scheme-contract');
COMMIT;
