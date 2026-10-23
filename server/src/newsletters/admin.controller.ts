import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { NewslettersService } from './newsletters.service';
import { NewsletterDto, NewsletterTestDto } from './dtos';

const uuid = new ParseUUIDPipe({ version: '4' });

@Controller('admin/newsletters')
@UseGuards(JwtCookieAuthGuard, PermissionsGuard)
@RequirePermissions('subscribers.read')
export class AdminNewslettersController {
  constructor(private readonly svc: NewslettersService) {}

  @Get()
  overview() {
    return this.svc.overview();
  }

  /** Published projects to pick from when featuring projects in a newsletter. */
  @Get('projects')
  projects() {
    return this.svc.projectOptions();
  }

  /** Renders unsaved edits, for the live preview next to the editor. */
  @Post('preview')
  @HttpCode(200)
  @RequirePermissions('subscribers.write')
  preview(@Body() dto: NewsletterDto) {
    return this.svc.preview(dto);
  }

  @Post()
  @RequirePermissions('subscribers.write')
  create(@Body() dto: NewsletterDto, @Req() req: any) {
    return this.svc.create(dto, req.user?.sub);
  }

  @Get(':id')
  get(@Param('id', uuid) id: string) {
    return this.svc.get(id);
  }

  @Get(':id/failures')
  failures(@Param('id', uuid) id: string) {
    return this.svc.failures(id);
  }

  @Put(':id')
  @RequirePermissions('subscribers.write')
  update(@Param('id', uuid) id: string, @Body() dto: NewsletterDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('subscribers.write')
  async remove(@Param('id', uuid) id: string) {
    await this.svc.remove(id);
  }

  @Post(':id/duplicate')
  @RequirePermissions('subscribers.write')
  duplicate(@Param('id', uuid) id: string, @Req() req: any) {
    return this.svc.duplicate(id, req.user?.sub);
  }

  @Post(':id/test')
  @HttpCode(200)
  @RequirePermissions('subscribers.write')
  test(@Param('id', uuid) id: string, @Body() dto: NewsletterTestDto, @Req() req: any) {
    return this.svc.sendTest(id, dto.email, req.user?.sub);
  }

  /** Sends the next batch; the admin page keeps calling this until nothing is left. */
  @Post(':id/send')
  @HttpCode(200)
  @RequirePermissions('subscribers.write')
  send(@Param('id', uuid) id: string) {
    return this.svc.sendBatch(id);
  }

  @Post(':id/retry-failed')
  @HttpCode(200)
  @RequirePermissions('subscribers.write')
  retry(@Param('id', uuid) id: string) {
    return this.svc.retryFailed(id);
  }
}
