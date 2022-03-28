import { Controller, Get } from '@nestjs/common';

@Controller('healthchecks')
export class HealthChecksController {
    @Get('ping')
    public getHello(): { status: 'ok' } {
        return { status: 'ok' };
    }
}
