import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { LeadsService } from './leads.service';
import { LeadPipelineService } from './lead-pipeline.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LeadNoteDto, LeadUpdateDto } from './dtos';

@Controller('admin/leads')
@UseGuards(JwtCookieAuthGuard, PermissionsGuard)
@RequirePermissions('leads.read')
export class AdminLeadsController {
  constructor(private readonly svc: LeadsService, private readonly pipeline: LeadPipelineService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('due') due?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.pipeline.list(
      { type, status, assignedTo, due, page: page ? Number(page) : 1, pageSize: pageSize ? Number(pageSize) : 25 },
      req.user.sub,
    );
  }

  @Get('export')
  async export(@Query('type') type: string | undefined, @Query('months') months?: string, @Res() res: Response = undefined as any) {
    const m = months ? Math.max(1, Math.min(24, parseInt(months))) : undefined;
    const since = m ? new Date(Date.now() - m * 30 * 24 * 60 * 60 * 1000) : undefined;
    const csv = await this.svc.exportCsv(type, since);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads${type ? '-' + type : ''}.csv"`);
    return res.send(csv);
  }

  /** People a lead can be assigned to. */
  @Get('assignees')
  assignees() {
    return this.pipeline.assignees();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.pipeline.get(id);
  }

  /** Change stage, owner and/or next follow-up. Each change is recorded on the lead's timeline. */
  @Patch(':id')
  @RequirePermissions('leads.write')
  update(@Req() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: LeadUpdateDto) {
    return this.pipeline.update(id, dto, req.user.sub);
  }

  @Post(':id/notes')
  @RequirePermissions('leads.write')
  addNote(@Req() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: LeadNoteDto) {
    return this.pipeline.addNote(id, dto.body, req.user.sub);
  }
}
