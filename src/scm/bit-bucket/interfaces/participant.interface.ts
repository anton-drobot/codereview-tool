import { IParticipantUser } from './participant-user.interface';

export interface IParticipant {
    user: IParticipantUser;
    role: 'AUTHOR' | 'REVIEWER' | 'PARTICIPANT';
    approved: boolean;
    status: 'UNAPPROVED' | 'NEEDS_WORK' | 'APPROVED';
}
