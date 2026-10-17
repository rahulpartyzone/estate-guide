import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { DbStorageDriver } from './db-storage.driver';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, StorageModule, AuthModule],
  controllers: [FilesController],
  providers: [FilesService, DbStorageDriver],
  exports: [FilesService],
})
export class FilesModule {}
