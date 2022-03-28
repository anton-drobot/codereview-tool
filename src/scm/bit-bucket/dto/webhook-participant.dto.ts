import { ValidateNested } from 'class-validator';

import { WebhookUserDto } from './webhook-user.dto';

export class WebhookParticipantDto {
    @ValidateNested()
    public user: WebhookUserDto;
}
