import { Module } from '@nestjs/common';
import { GcsService } from './gcs.service';
import { R2Service } from './r2.service';

@Module({ providers: [GcsService, R2Service], exports: [GcsService, R2Service] })
export class StorageModule {}
