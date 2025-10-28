import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { DbStorageDriver } from './db-storage.driver';
import { GcsStorageDriver } from './gcs-storage.driver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [FilesService, DbStorageDriver, GcsStorageDriver],
  exports: [FilesService],
})
export class FilesModule {}
