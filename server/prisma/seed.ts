/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Idempotent admin user
  const adminEmail = 'admin@local';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash('admin123');
    await prisma.user.create({ data: { email: adminEmail, password: passwordHash, role: 'ADMIN' } });
    console.log('Created admin user admin@local / admin123');
  } else {
    console.log('Admin user already exists');
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
