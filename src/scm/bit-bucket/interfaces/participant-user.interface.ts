export interface IParticipantUser {
    name: string;
    emailAddress: string;
    id: number;
    displayName: string;
    active: boolean;
    slug: string;
    type: 'NORMAL';
    links: {
        self: Array<{ href: string }>;
    };
}
