import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { UseGuards } from '@nestjs/common';

@Controller('admin/users')
@UseGuards(JwtCookieAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.findAll();
  }
}
