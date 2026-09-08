BEGIN;
INSERT INTO payment_accounts(id,provider,merchant_id,account_name,account_masked,binding_status) VALUES ('00000000-0000-4000-8000-000000000910','bank','DEMO-HQ','总部开发账户（未绑定）','****0000','unbound') ON CONFLICT DO NOTHING;
INSERT INTO settlement_rules(id,store_id,version,cycle_unit,cycle_value,effective_from,status) VALUES ('00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000001',1,'day',1,'2026-01-01','draft') ON CONFLICT DO NOTHING;
INSERT INTO settlement_rule_items(rule_id,payment_account_id,ratio) VALUES ('00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000910',1) ON CONFLICT DO NOTHING;
COMMIT;
