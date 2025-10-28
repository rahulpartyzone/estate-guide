import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      // Provide a clearer error than Prisma's initialization error
      // eslint-disable-next-line no-console
      console.error('\nDATABASE_URL is not set. Create server/.env (copy .env.example) and fill DATABASE_URL.');
      throw new Error('Missing DATABASE_URL environment variable.');
    }
    await this.$connect();
  }
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
