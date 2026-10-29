-- Apply the owner's revised deposits to new quotes and inventory only.
-- Existing booking snapshots, contracts and financial entries keep their recorded terms.
UPDATE equipment SET config=json_set(config,'$.variants',json((SELECT json_group_array(json_set(value,'$.deposit',json_array(1000,1000))) FROM json_each(equipment.config,'$.variants')))),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id='x5';
--> statement-breakpoint
UPDATE equipment SET config=json_set(config,'$.variants',json((SELECT json_group_array(json_set(value,'$.deposit',json_array(1500,1500))) FROM json_each(equipment.config,'$.variants')))),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id='x6';
--> statement-breakpoint
UPDATE equipment SET config=json_set(config,'$.variants',json((SELECT json_group_array(json_set(value,'$.deposit',json_array(800,800))) FROM json_each(equipment.config,'$.variants')))),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id='neo2';
--> statement-breakpoint
UPDATE equipment_inventory SET security_deposit_amount=CASE equipment_id WHEN 'x5' THEN 1000 WHEN 'x6' THEN 1500 WHEN 'neo2' THEN 800 END,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE equipment_id IN ('x5','x6','neo2');
