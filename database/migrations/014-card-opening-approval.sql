-- Add card opening to the existing approval workflow without changing historical records.
BEGIN;
ALTER TABLE approval_templates DROP CONSTRAINT approval_templates_business_type_check;
ALTER TABLE approval_templates ADD CONSTRAINT approval_templates_business_type_check
  CHECK (business_type IN ('card_opening', 'price_change', 'contract', 'other_configured'));
ALTER TABLE approval_instances DROP CONSTRAINT approval_instances_business_type_check;
ALTER TABLE approval_instances ADD CONSTRAINT approval_instances_business_type_check
  CHECK (business_type IN ('card_opening', 'price_change', 'contract', 'other_configured'));
COMMIT;
