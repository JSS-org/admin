BEGIN;
CREATE TABLE member_faces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), photo_file_id uuid REFERENCES files(id),
 provider varchar(64) NOT NULL, subject_id varchar(255) NOT NULL, template_secret_ref text, consent_at timestamptz, consent_version varchar(64),
 status varchar(32) NOT NULL CHECK(status IN ('active','revoked','pending')), enrolled_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,subject_id)
);
CREATE UNIQUE INDEX member_faces_current_idx ON member_faces(provider,member_id) WHERE status='active';
CREATE TABLE client_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid REFERENCES members(id), employee_id uuid REFERENCES employees(id),
 platform varchar(32) NOT NULL, app_id varchar(128) NOT NULL, device_uid varchar(255) NOT NULL, push_token_secret_ref text,
 last_seen_at timestamptz, revoked_at timestamptz, extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(member_id,employee_id)=1), UNIQUE(app_id,device_uid)
);
CREATE TABLE blacklists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), block_entry boolean NOT NULL, block_purchase boolean NOT NULL,
 reason text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz, revoked_at timestamptz, created_by uuid NOT NULL REFERENCES admin_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(block_entry OR block_purchase), CHECK(ends_at IS NULL OR ends_at>starts_at)
);
CREATE UNIQUE INDEX blacklists_current_idx ON blacklists(member_id) WHERE revoked_at IS NULL;
CREATE TABLE devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), name varchar(120) NOT NULL,
 type varchar(32) NOT NULL CHECK(type IN ('door','locker','camera','face_reader')), provider varchar(64) NOT NULL, device_uid varchar(128) NOT NULL,
 model varchar(255), gateway_id varchar(255), connection_secret_ref text, location varchar(255), door_mode varchar(32) CHECK(door_mode IN ('normal','ab')),
 status varchar(32) NOT NULL CHECK(status IN ('active','inactive')), last_seen_at timestamptz, capabilities jsonb NOT NULL DEFAULT '[]', extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,device_uid), UNIQUE(id,store_id)
);
CREATE INDEX devices_store_idx ON devices(store_id,type,status);
CREATE TABLE locker_compartments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), device_id uuid NOT NULL REFERENCES devices(id), compartment_no varchar(32) NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('available','occupied','inactive')), current_member_id uuid REFERENCES members(id), occupied_since timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(device_id,compartment_no), UNIQUE(id,device_id),
 CHECK((current_member_id IS NULL)=(occupied_since IS NULL))
);
CREATE TABLE locker_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), compartment_id uuid NOT NULL REFERENCES locker_compartments(id), member_id uuid NOT NULL REFERENCES members(id),
 started_at timestamptz NOT NULL, ended_at timestamptz, source_key varchar(255) NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(ended_at IS NULL OR ended_at>=started_at)
);
CREATE UNIQUE INDEX locker_usage_occupied_idx ON locker_usage(compartment_id) WHERE ended_at IS NULL;
CREATE TABLE device_commands (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), device_id uuid NOT NULL REFERENCES devices(id), compartment_id uuid,
 command varchar(32) NOT NULL CHECK(command IN ('open_door','open_locker')), requested_by uuid NOT NULL REFERENCES admin_accounts(id), reason text NOT NULL,
 request_key varchar(128) NOT NULL, request_digest varchar(255) NOT NULL, provider_command_id varchar(255),
 status varchar(32) NOT NULL CHECK(status IN ('queued','sent','succeeded','failed','timeout')), requested_at timestamptz NOT NULL,
 acknowledged_at timestamptz, failure_reason text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(device_id,request_key), FOREIGN KEY(compartment_id,device_id) REFERENCES locker_compartments(id,device_id),
 CHECK((command='open_locker')=(compartment_id IS NOT NULL))
);
CREATE INDEX device_commands_time_idx ON device_commands(device_id,requested_at DESC);
CREATE TABLE equipment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), code varchar(64) NOT NULL, name varchar(120) NOT NULL, model varchar(120),
 status varchar(32) NOT NULL CHECK(status IN ('active','inactive')), extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store_id,code)
);
CREATE TABLE equipment_tutorials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), equipment_id uuid NOT NULL REFERENCES equipment(id), title varchar(120) NOT NULL, file_id uuid NOT NULL REFERENCES files(id),
 instructions text, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0), status varchar(32) NOT NULL CHECK(status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE access_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL UNIQUE REFERENCES stores(id), multi_entry_window_seconds integer NOT NULL DEFAULT 30 CHECK(multi_entry_window_seconds>0),
 guest_freeze_threshold integer NOT NULL DEFAULT 3 CHECK(guest_freeze_threshold>=0), night_starts_at time, night_ends_at time, max_stay_minutes integer CHECK(max_stay_minutes>0),
 block_debt boolean NOT NULL DEFAULT true, ab_door_exempt boolean NOT NULL DEFAULT false, status varchar(32) NOT NULL CHECK(status IN ('active','inactive')),
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE access_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), device_id uuid NOT NULL, store_id uuid NOT NULL REFERENCES stores(id), member_id uuid REFERENCES members(id),
 direction varchar(32) NOT NULL CHECK(direction IN ('entry','exit')), result varchar(32) NOT NULL CHECK(result IN ('allowed','denied','unknown')), reason text,
 occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), provider_event_id varchar(255) NOT NULL,
 companion_count integer NOT NULL DEFAULT 0 CHECK(companion_count>=0), extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(device_id,provider_event_id), FOREIGN KEY(device_id,store_id) REFERENCES devices(id,store_id)
);
CREATE INDEX access_events_store_time_idx ON access_events(store_id,occurred_at DESC,id);
CREATE TABLE face_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), device_id uuid NOT NULL REFERENCES devices(id), member_id uuid REFERENCES members(id), member_face_id uuid REFERENCES member_faces(id),
 access_event_id uuid REFERENCES access_events(id), provider_event_id varchar(255) NOT NULL, matched boolean NOT NULL, liveness_passed boolean,
 occurred_at timestamptz NOT NULL, evidence_file_id uuid REFERENCES files(id), extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(device_id,provider_event_id), CHECK(NOT matched OR member_id IS NOT NULL)
);
CREATE INDEX face_events_member_time_idx ON face_events(member_id,occurred_at DESC);
CREATE TABLE guest_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id), access_event_id uuid NOT NULL UNIQUE REFERENCES access_events(id),
 guest_count integer NOT NULL CHECK(guest_count>0), occurred_at timestamptz NOT NULL, confirmed boolean NOT NULL DEFAULT false,
 confirmed_by uuid REFERENCES admin_accounts(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE access_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), device_id uuid REFERENCES devices(id), member_id uuid REFERENCES members(id), access_event_id uuid REFERENCES access_events(id),
 type varchar(32) NOT NULL CHECK(type IN ('multi_entry','guest_limit','overstay','blacklist','debt','face_mismatch')), occurred_at timestamptz NOT NULL,
 status varchar(32) NOT NULL CHECK(status IN ('pending','resolved','ignored')), details jsonb NOT NULL DEFAULT '{}', resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_alerts_store_idx ON access_alerts(store_id,status,occurred_at DESC);
CREATE TABLE store_occupancy (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL UNIQUE REFERENCES stores(id), count integer NOT NULL CHECK(count>=0),
 measured_at timestamptz NOT NULL, source varchar(32) NOT NULL, reliable boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE checkins ADD CONSTRAINT checkins_device_fk FOREIGN KEY(device_id) REFERENCES devices(id), ADD CONSTRAINT checkins_access_event_fk FOREIGN KEY(access_event_id) REFERENCES access_events(id);
ALTER TABLE lesson_records ADD CONSTRAINT lessons_face_event_fk FOREIGN KEY(face_event_id) REFERENCES face_events(id);
ALTER TABLE training_plan_items ADD CONSTRAINT training_plan_equipment_fk FOREIGN KEY(equipment_id) REFERENCES equipment(id);
INSERT INTO schema_migrations(version,name) VALUES(5,'devices-and-access');
COMMIT;
