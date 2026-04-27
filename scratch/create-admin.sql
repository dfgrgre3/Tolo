-- Create admin user
INSERT INTO users (id, email, name, username, password_hash, role, status, email_verified, total_xp, level, created_at, updated_at)
VALUES (
  '3d2af3f6-c44e-48c0-a428-78c80358ff2f',
  'admin@thanawy.com',
  'Admin User',
  'admin',
  '$2a$12$DC18GZ1hXc9SWcpK7AremuVg2E9KIObeiAcfV2C/YxYjYDn3QfGTS',
  'ADMIN',
  'ACTIVE',
  true,
  1000,
  10,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  email_verified = EXCLUDED.email_verified;