import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Query, UseGuards, Res } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { Response } from 'express';

@Controller('admin/subscribers')
@UseGuards(JwtCookieAuthGuard)
export class AdminSubscribersController {
  constructor(private readonly svc: SubscribersService) {}

  @Get()
  list(@Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.svc.list(status, page ? Number(page) : 1, pageSize ? Number(pageSize) : 25);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.svc.remove(id);
  }

  @Get('export')
  async export(@Res() res: Response) {
    const csv = await this.svc.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
    return res.send(csv);
  }
}
