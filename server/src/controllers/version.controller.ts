import { Controller, Get } from '@nestjs/common';

@Controller('version')
export class VersionController {
  @Get()
  version() {
    return {
      version: process.env.npm_package_version || '1.0.0',
      commit: process.env.GIT_COMMIT || 'unknown',
    };
  }
}
