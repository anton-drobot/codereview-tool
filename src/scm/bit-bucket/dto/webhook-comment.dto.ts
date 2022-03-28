import { IsString } from 'class-validator';

export class WebhookCommentDto {
    @IsString()
    public text: string;
}
