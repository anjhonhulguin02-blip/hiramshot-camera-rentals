-- Custom SQL migration file, put your code below! --
-- Correct only the unclaimed seeded business profile; retain its UUID and references.
UPDATE users SET email='hiramshotcamerarentals@gmail.com',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id='00000000-0000-4000-8000-000000000001' AND email='hiramshotrentals@gmail.com' AND auth_user_id IS NULL
AND NOT EXISTS(SELECT 1 FROM users WHERE email='hiramshotcamerarentals@gmail.com');
--> statement-breakpoint
-- Retire stale seeded administrator access without changing a claimed identity email.
UPDATE users SET role='CLIENT',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id='00000000-0000-4000-8000-000000000001' AND email='hiramshotrentals@gmail.com';
--> statement-breakpoint
INSERT INTO users(id,role,full_name,email,created_at,updated_at)
VALUES ('00000000-0000-4000-8000-000000000002','ADMIN','HiramShot Administrator','hiramshotcamerarentals@gmail.com',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'))
ON CONFLICT(email) DO NOTHING;
