import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/auth.decorators.js';
import { AppService } from './app.service.js';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
