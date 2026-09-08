-- Development devices are simulators only.
BEGIN;
INSERT INTO devices (id,store_id,name,type,provider,device_uid,location,door_mode,status,last_seen_at,capabilities) VALUES ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000001','入口门禁（模拟）','door','mock','MOCK-DOOR-1','入口','normal','active','2026-09-08T07:29:20.116Z','["open_door"]') ON CONFLICT DO NOTHING;
INSERT INTO devices (id,store_id,name,type,provider,device_uid,location,door_mode,status,last_seen_at,capabilities) VALUES ('00000000-0000-4000-8000-000000000511','00000000-0000-4000-8000-000000000001','储物柜（模拟）','locker','mock','MOCK-LOCKER-1','更衣区',NULL,'active','2026-09-08T07:29:20.116Z','["open_locker"]') ON CONFLICT DO NOTHING;
INSERT INTO devices (id,store_id,name,type,provider,device_uid,location,door_mode,status,last_seen_at,capabilities) VALUES ('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000002','入口门禁（模拟）','door','mock','MOCK-DOOR-2','入口','normal','active','2026-09-08T07:29:20.116Z','["open_door"]') ON CONFLICT DO NOTHING;
INSERT INTO devices (id,store_id,name,type,provider,device_uid,location,door_mode,status,last_seen_at,capabilities) VALUES ('00000000-0000-4000-8000-000000000512','00000000-0000-4000-8000-000000000002','储物柜（模拟）','locker','mock','MOCK-LOCKER-2','更衣区',NULL,'active','2026-09-08T07:29:20.116Z','["open_locker"]') ON CONFLICT DO NOTHING;
INSERT INTO locker_compartments (id,device_id,compartment_no,status) VALUES ('00000000-0000-4000-8000-000000000531','00000000-0000-4000-8000-000000000511','001','available') ON CONFLICT DO NOTHING;
INSERT INTO locker_compartments (id,device_id,compartment_no,status) VALUES ('00000000-0000-4000-8000-000000000532','00000000-0000-4000-8000-000000000511','002','available') ON CONFLICT DO NOTHING;
INSERT INTO locker_compartments (id,device_id,compartment_no,status) VALUES ('00000000-0000-4000-8000-000000000533','00000000-0000-4000-8000-000000000511','003','available') ON CONFLICT DO NOTHING;
INSERT INTO locker_compartments (id,device_id,compartment_no,status) VALUES ('00000000-0000-4000-8000-000000000541','00000000-0000-4000-8000-000000000512','001','available') ON CONFLICT DO NOTHING;
INSERT INTO locker_compartments (id,device_id,compartment_no,status) VALUES ('00000000-0000-4000-8000-000000000542','00000000-0000-4000-8000-000000000512','002','available') ON CONFLICT DO NOTHING;
INSERT INTO locker_compartments (id,device_id,compartment_no,status) VALUES ('00000000-0000-4000-8000-000000000543','00000000-0000-4000-8000-000000000512','003','available') ON CONFLICT DO NOTHING;
INSERT INTO equipment (id,store_id,code,name,model,status) VALUES ('00000000-0000-4000-8000-000000000551','00000000-0000-4000-8000-000000000001','EQ-1','史密斯训练器','SM-01','active') ON CONFLICT DO NOTHING;
INSERT INTO equipment (id,store_id,code,name,model,status) VALUES ('00000000-0000-4000-8000-000000000552','00000000-0000-4000-8000-000000000002','EQ-2','史密斯训练器','SM-01','active') ON CONFLICT DO NOTHING;
COMMIT;
