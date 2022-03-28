import { ICodeReviewConfigAllowedUser } from './code-review-config-allowed-user.interface';

export interface ICodeReviewConfig {
    allowedUsers: ICodeReviewConfigAllowedUser[];
    reviewersCount: number;
    approveCount: number;
    autoAssign: boolean;
    notification: 'telegram';
}
