/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const defaultRoles = [
  { name: 'ConsoleAdmin', description: 'Primary admin role for onboarding and RBAC-managed access', isSystem: true },
  { name: 'SuperAdmin', description: 'Full access including RBAC and menu configuration', isSystem: true },
  { name: 'Admin', description: 'Administrative access to business modules', isSystem: true },
  { name: 'Editor', description: 'Can manage content modules', isSystem: true },
  { name: 'Viewer', description: 'Read-only dashboard access', isSystem: true },
];

const defaultPermissionKeys = [
  'dashboard.read',
  'projects.read',
  'projects.write',
  'builders.read',
  'builders.write',
  'news.read',
  'news.write',
  'testimonials.read',
  'testimonials.write',
  'amenities.read',
  'amenities.write',
  'leads.read',
  'subscribers.read',
  'company.read',
  'company.write',
  'users.read',
  'users.write',
  'rbac.manage',
  'settings.read',
  'settings.write',
];

const defaultMenus = [
  { key: 'projects', label: 'Projects', path: '/admin/projects', icon: 'Building2', sortOrder: 10 },
  { key: 'builders', label: 'Builders', path: '/admin/builders', icon: 'HardHat', sortOrder: 20 },
  { key: 'news', label: 'News', path: '/admin/news', icon: 'Newspaper', sortOrder: 30 },
  { key: 'company', label: 'Company', path: '/admin/company', icon: 'Building', sortOrder: 40 },
  { key: 'testimonials', label: 'Testimonials', path: '/admin/testimonials', icon: 'MessageSquare', sortOrder: 50 },
  { key: 'leads', label: 'Leads', path: '/admin/leads', icon: 'Users', sortOrder: 60 },
  { key: 'subscribers', label: 'Subscribers', path: '/admin/subscribers', icon: 'Mail', sortOrder: 70 },
  { key: 'users', label: 'Users', path: '/admin/users', icon: 'User', sortOrder: 80 },
  { key: 'roles', label: 'Roles', path: '/admin/roles', icon: 'Shield', sortOrder: 90 },
  { key: 'change-password', label: 'Change Password', path: '/admin/change-password', icon: 'KeyRound', sortOrder: 95 },
  { key: 'settings', label: 'Settings', path: '/admin/settings', icon: 'Settings', sortOrder: 100 },
  { key: 'amenities', label: 'Amenities', path: '/admin/amenities', icon: 'Sparkles', sortOrder: 110 },
];

async function main() {
  // Idempotent admin user
  const adminEmail = 'admin@local.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash('admin123');
    await prisma.user.create({ data: { email: adminEmail, password: passwordHash, role: 'ADMIN' } });
    console.log('Created admin user admin@local.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  const roleMap = new Map<string, { id: string; name: string }>();
  for (const role of defaultRoles) {
    const upserted = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: role,
      select: { id: true, name: true },
    });
    roleMap.set(role.name, upserted);
  }

  for (const key of defaultPermissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    });
  }

  for (const menu of defaultMenus) {
    await prisma.menuItem.upsert({
      where: { key: menu.key },
      update: {
        label: menu.label,
        path: menu.path,
        icon: menu.icon,
        sortOrder: menu.sortOrder,
        isEnabled: true,
      },
      create: {
        key: menu.key,
        label: menu.label,
        path: menu.path,
        icon: menu.icon,
        sortOrder: menu.sortOrder,
        isEnabled: true,
      },
    });
  }

  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
  const consoleAdminRole = roleMap.get('ConsoleAdmin');
  if (adminUser && consoleAdminRole) {
    await prisma.userRole.deleteMany({ where: { userId: adminUser.id } });
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: consoleAdminRole.id,
      },
    });
    await prisma.userRole.deleteMany({
      where: {
        roleId: consoleAdminRole.id,
        userId: { not: adminUser.id },
      },
    });
  }

  const allPermissionIds = await prisma.permission.findMany({ select: { id: true, key: true } });
  const allMenuItems = await prisma.menuItem.findMany({ select: { id: true, key: true } });
  const allPermissionIdSet = new Set(allPermissionIds.map((p) => p.id));

  const adminPermissionKeys = [
    'dashboard.read',
    'projects.read', 'projects.write',
    'builders.read', 'builders.write',
    'news.read', 'news.write',
    'testimonials.read', 'testimonials.write',
    'amenities.read', 'amenities.write',
    'leads.read', 'subscribers.read',
    'company.read', 'company.write',
    'users.read',
    'settings.read', 'settings.write',
  ];
  const editorPermissionKeys = [
    'dashboard.read',
    'projects.read', 'projects.write',
    'builders.read', 'builders.write',
    'news.read', 'news.write',
    'testimonials.read', 'testimonials.write',
    'amenities.read', 'amenities.write',
    'company.read',
    'settings.read',
  ];
  const viewerPermissionKeys = [
    'dashboard.read',
    'projects.read',
    'builders.read',
    'news.read',
    'testimonials.read',
    'amenities.read',
    'leads.read',
    'subscribers.read',
    'company.read',
    'users.read',
    'settings.read',
  ];

  const permissionMap = new Map(allPermissionIds.map((p) => [p.key, p.id]));
  const rolePermissions: Record<string, string[]> = {
    ConsoleAdmin: allPermissionIds.map((p) => p.id),
    SuperAdmin: allPermissionIds.map((p) => p.id),
    Admin: adminPermissionKeys.map((k) => permissionMap.get(k)).filter((id): id is string => Boolean(id)),
    Editor: editorPermissionKeys.map((k) => permissionMap.get(k)).filter((id): id is string => Boolean(id)),
    Viewer: viewerPermissionKeys.map((k) => permissionMap.get(k)).filter((id): id is string => Boolean(id)),
  };

  for (const [roleName, rolePermIds] of Object.entries(rolePermissions)) {
    const role = roleMap.get(roleName);
    if (!role) continue;

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: rolePermIds.length ? rolePermIds : ['__none__'] },
      },
    });

    for (const permissionId of rolePermIds) {
      if (!allPermissionIdSet.has(permissionId)) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }

    for (const menu of allMenuItems) {
      await prisma.roleMenuAccess.upsert({
        where: { roleId_menuItemId: { roleId: role.id, menuItemId: menu.id } },
        update: { canView: true },
        create: { roleId: role.id, menuItemId: menu.id, canView: true },
      });
    }
  }

  // Builder
  const builderName = 'Sample Builder';
  let builder = await prisma.builder.findFirst({ where: { name: builderName } });
  if (!builder) {
    builder = await prisma.builder.create({
      data: {
        name: builderName,
        description: 'A reputable builder with several flagship projects.',
        experienceYears: 12,
  rating: 4.5 as any,
        website: 'https://example-builder.test',
      },
    });
    console.log('Created builder');
  }

  // Amenities (connectOrCreate style)
  const amenityNames = ['Club House', 'Swimming Pool', 'Gym', 'Garden'];
  const amenities = [] as { id: string; name: string }[];
  for (const name of amenityNames) {
    const a = await prisma.amenity.upsert({ where: { name }, update: {}, create: { name } });
    amenities.push(a);
  }

  // Property
  const propSlug = 'sample-project';
  let property = await prisma.property.findUnique({ where: { slug: propSlug } });
  if (!property) {
    property = await prisma.property.create({
      data: {
        builderId: builder.id,
        name: 'Sample Project',
        slug: propSlug,
        description: 'A showcase residential development used as seed data.',
        city: 'Pune',
        area: 'Kalyani Nagar',
        propertyType: 'Apartment',
        status: 'UnderConstruction',
        isHotProject: true,
  priceMin: 7500000 as any,
  priceMax: 12500000 as any,
        sizeMin: 850,
        sizeMax: 1450,
        bedrooms: 3,
        bathrooms: 2,
        mainImageUrl: 'https://via.placeholder.com/800x400.png?text=Sample+Project',
        images: {
          create: [
            { url: 'https://via.placeholder.com/800x400.png?text=Front+View', altText: 'Front View', sortOrder: 1 },
            { url: 'https://via.placeholder.com/800x400.png?text=Lobby', altText: 'Lobby', sortOrder: 2 },
          ],
        },
        amenities: {
          create: amenities.map((a) => ({ amenity: { connect: { id: a.id } } })),
        },
        floorPlans: {
          create: [
            { unitType: '2 BHK', size: 850, unit: 'sqft', price: 7500000 as any, imageUrl: 'https://via.placeholder.com/600x400.png?text=2BHK' },
            { unitType: '3 BHK', size: 1250, unit: 'sqft', price: 10500000 as any, imageUrl: 'https://via.placeholder.com/600x400.png?text=3BHK' },
          ],
        },
        tags: ['seed', 'demo'],
        seoTitle: 'Sample Project - Demo',
        seoDescription: 'Seed project for initial development environment.',
      },
    });
    console.log('Created property');
  }

  // Testimonial
  const testimonialExists = await prisma.testimonial.findFirst({ where: { name: 'John Doe', company: 'Acme Corp' } });
  if (!testimonialExists) {
    await prisma.testimonial.create({
      data: {
        name: 'John Doe',
        role: 'Home Buyer',
        company: 'Acme Corp',
        content: 'Great experience exploring the sample project!',
        rating: 5,
        published: true,
      },
    });
    console.log('Created testimonial');
  }

  // Subscriber
  const subEmail = 'subscriber@example.com';
  const sub = await prisma.subscriber.findUnique({ where: { email: subEmail } });
  if (!sub) {
    await prisma.subscriber.create({
      data: {
        email: subEmail,
        name: 'First Subscriber',
        unsubscribeToken: 'seed-token-1',
      },
    });
    console.log('Created subscriber');
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
