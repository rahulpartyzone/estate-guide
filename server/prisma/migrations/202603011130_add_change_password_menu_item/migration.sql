INSERT INTO "MenuItem" ("id", "key", "label", "path", "icon", "sortOrder", "isEnabled")
VALUES ('menu-change-password', 'change-password', 'Change Password', '/admin/change-password', 'KeyRound', 95, true)
ON CONFLICT ("key") DO UPDATE
SET "label" = EXCLUDED."label",
    "path" = EXCLUDED."path",
    "icon" = EXCLUDED."icon",
    "sortOrder" = EXCLUDED."sortOrder",
    "isEnabled" = EXCLUDED."isEnabled",
    "updatedAt" = now();

INSERT INTO "RoleMenuAccess" ("roleId", "menuItemId", "canView", "updatedAt")
SELECT r."id", m."id", true, now()
FROM "Role" r
JOIN "MenuItem" m ON m."key" = 'change-password'
ON CONFLICT ("roleId", "menuItemId") DO UPDATE
SET "canView" = EXCLUDED."canView",
    "updatedAt" = now();
