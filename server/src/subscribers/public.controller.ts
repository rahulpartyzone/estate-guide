import { Body, Controller, HttpCode, Post } from '@nestjs/common';
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
}
