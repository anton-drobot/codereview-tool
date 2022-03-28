import { IsEmail } from 'class-validator';

export class WebhookUserDto {
    @IsEmail()
    public emailAddress: string;
}
