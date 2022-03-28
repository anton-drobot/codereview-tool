export interface ICreateCommandParams {
    fromLink: string;
    toLink: string;
    project: string;
    repository: string;
    pullRequestId: number;
    pullRequestAuthor: string;
    pullRequestBranch: string;
    pullRequestTitle: string;
    pullRequestLink: string;
}
