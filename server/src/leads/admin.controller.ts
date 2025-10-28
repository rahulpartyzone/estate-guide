import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { LeadStatusUpdateDto } from './dtos';
import { Response } from 'express';

@Controller('admin/leads')
@UseGuards(JwtCookieAuthGuard)
export class AdminLeadsController {
  constructor(private readonly svc: LeadsService) {}

  @Get()
  list(@Query('type') type?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.svc.list(type, status, page ? Number(page) : 1, pageSize ? Number(pageSize) : 25);
  }

  @Patch(':id')
  updateStatus(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: LeadStatusUpdateDto) {
    return this.svc.updateStatus(id, dto.status);
  }

  @Get('export')
  async export(@Query('type') type: string | undefined, @Query('months') months?: string, @Res() res: Response = undefined as any) {
    const m = months ? Math.max(1, Math.min(24, parseInt(months))) : undefined;
    const since = m ? new Date(Date.now() - m * 30 * 24 * 60 * 60 * 1000) : undefined;
    const csv = await this.svc.exportCsv(type, since);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads${type?'-'+type:''}.csv"`);
    return res.send(csv);
  }

  @Get('stats/six-months')
  async sixMonths() {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      // Count brochure leads in this month
      const count = await (this as any).svc['prisma'].lead.count({ where: { type: 'brochure', createdAt: { gte: start, lt: end } } });
      months.push({ label: start.toLocaleString('en-US', { month: 'short', year: '2-digit' }), count });
    }
    return { months };
  }
}
