import { Body, Controller, HttpCode, NotFoundException, Post, Query } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { SubscriberCreateDto } from './dtos';

@Controller('subscribers')
export class PublicSubscribersController {
  constructor(private readonly svc: SubscribersService) {}

  @Post()
  async subscribe(@Body() dto: SubscriberCreateDto) {
    return this.svc.subscribe(dto);
  }

  @Post('unsubscribe')
  @HttpCode(204)
  async unsubscribe(@Body('token') token: string) {
    await this.svc.unsubscribeByToken(token);
  }

  /**
   * One-click unsubscribe (RFC 8058): Gmail and Outlook POST here from their own "Unsubscribe" button,
   * using the List-Unsubscribe header on newsletter emails.
   */
  @Post('unsubscribe/one-click')
  @HttpCode(200)
  async oneClick(@Query('token') token: string) {
    try {
      await this.svc.unsubscribeByToken(token || '');
    } catch (e) {
      if (!(e instanceof NotFoundException)) throw e;
    }
    return { ok: true };
  }
}
