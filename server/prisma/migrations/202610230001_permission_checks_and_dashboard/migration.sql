-- Admin endpoints now check role permissions (not just login).
-- This migration makes sure the roles and permissions those checks rely on exist,
-- adds two new write permissions, and adds the Dashboard menu item.
-- It only ever ADDS rows; it never removes permissions you changed in Admin -> Roles.

-- 1. System roles (normally created by the seed script)
INSERT INTO "Role" ("id", "name", "description", "isSystem", "updatedAt") VALUES
  ('role-console-admin', 'ConsoleAdmin', 'Primary admin role for onboarding and RBAC-managed access', true, now()),
  ('role-super-admin',   'SuperAdmin',   'Full access including RBAC and menu configuration', true, now()),
  ('role-admin',         'Admin',        'Administrative access to business modules', true, now()),
  ('role-editor',        'Editor',       'Can manage content modules', true, now()),
  ('role-viewer',        'Viewer',       'Read-only dashboard access', true, now())
ON CONFLICT ("name") DO NOTHING;

-- 2. Permissions (the seed's set, plus leads.write and subscribers.write)
INSERT INTO "Permission" ("id", "key", "description", "updatedAt") VALUES
  ('perm-dashboard-read',     'dashboard.read',     'View the dashboard', now()),
  ('perm-projects-read',      'projects.read',      'View projects', now()),
  ('perm-projects-write',     'projects.write',     'Create and edit projects', now()),
  ('perm-builders-read',      'builders.read',      'View builders', now()),
  ('perm-builders-write',     'builders.write',     'Create and edit builders', now()),
  ('perm-news-read',          'news.read',          'View news', now()),
  ('perm-news-write',         'news.write',         'Create and edit news', now()),
  ('perm-testimonials-read',  'testimonials.read',  'View testimonials', now()),
  ('perm-testimonials-write', 'testimonials.write', 'Create and edit testimonials', now()),
  ('perm-amenities-read',     'amenities.read',     'View amenities', now()),
  ('perm-amenities-write',    'amenities.write',    'Create and edit amenities', now()),
  ('perm-leads-read',         'leads.read',         'View and export leads', now()),
  ('perm-leads-write',        'leads.write',        'Change lead status', now()),
  ('perm-subscribers-read',   'subscribers.read',   'View and export subscribers', now()),
  ('perm-subscribers-write',  'subscribers.write',  'Remove subscribers', now()),
  ('perm-company-read',       'company.read',       'View company details', now()),
  ('perm-company-write',      'company.write',      'Edit company details', now()),
  ('perm-users-read',         'users.read',         'View users', now()),
  ('perm-users-write',        'users.write',        'Invite and edit users', now()),
  ('perm-rbac-manage',        'rbac.manage',        'Manage roles and menu access', now()),
  ('perm-settings-read',      'settings.read',      'View settings', now()),
  ('perm-settings-write',     'settings.write',     'Edit settings', now())
ON CONFLICT ("key") DO NOTHING;

-- 3. Baseline grants, only for roles that have no permissions at all (seed never run).
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON
     (r."name" IN ('ConsoleAdmin', 'SuperAdmin'))
  OR (r."name" = 'Admin' AND p."key" IN ('dashboard.read','projects.read','projects.write','builders.read','builders.write',
        'news.read','news.write','testimonials.read','testimonials.write','amenities.read','amenities.write',
        'leads.read','subscribers.read','company.read','company.write','users.read','settings.read','settings.write'))
  OR (r."name" = 'Editor' AND p."key" IN ('dashboard.read','projects.read','projects.write','builders.read','builders.write',
        'news.read','news.write','testimonials.read','testimonials.write','amenities.read','amenities.write',
        'company.read','settings.read'))
  OR (r."name" = 'Viewer' AND p."key" IN ('dashboard.read','projects.read','builders.read','news.read','testimonials.read',
        'amenities.read','leads.read','subscribers.read','company.read','users.read','settings.read'))
WHERE NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id")
ON CONFLICT DO NOTHING;

-- 4. The two new permissions go to the admin roles, whatever else they have.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('leads.write', 'subscribers.write')
WHERE r."name" IN ('ConsoleAdmin', 'SuperAdmin', 'Admin')
ON CONFLICT DO NOTHING;

-- 5. Dashboard menu item, visible to every role.
INSERT INTO "MenuItem" ("id", "key", "label", "path", "icon", "sortOrder", "isEnabled", "updatedAt")
VALUES ('menu-dashboard', 'dashboard', 'Dashboard', '/admin/dashboard', 'LayoutDashboard', 5, true, now())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RoleMenuAccess" ("roleId", "menuItemId", "canView", "updatedAt")
SELECT r."id", m."id", true, now()
FROM "Role" r
JOIN "MenuItem" m ON m."key" = 'dashboard'
ON CONFLICT ("roleId", "menuItemId") DO NOTHING;
