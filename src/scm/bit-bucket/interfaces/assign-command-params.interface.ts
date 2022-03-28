export interface IAssignCommandParams {
    fromLink: string;
    toLink: string;
    project: string;
    repository: string;
    pullRequestId: number;
    pullRequestAuthor: string;
    pullRequestBranch: string;
}
