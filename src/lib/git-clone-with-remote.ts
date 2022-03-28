import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

interface IGitCloneWithRemoteParams {
    fromLink: string;
    toLink: string;
    baseBranch: string;
    pullRequestBranch: string;
}

export async function gitCloneWithRemote(params: IGitCloneWithRemoteParams): Promise<string> {
    return new Promise((resolve: (directory: string) => void, reject: (reason: Error) => void) => {
        const hash = randomUUID();
        const baseDirectory = path.join(process.cwd(), 'pull-requests');

        fs.mkdir(baseDirectory, { recursive: true }, () => {
            const directory = path.join(baseDirectory, hash);
            const gitDirectory = path.join(directory, '.git');

            const clone = spawn('git', [
                'clone',
                '--branch',
                params.pullRequestBranch,
                '--recursive',
                '--single-branch',
                params.fromLink,
                directory
            ]);

            clone.on('close', (cloneExitCode: number) => {
                if (cloneExitCode === 0) {
                    const remoteAdd = spawn('git', ['--git-dir', gitDirectory, 'remote', 'add', 'upstream', params.toLink]);

                    remoteAdd.on('close', (remoteAddExitCode: number) => {
                        if (remoteAddExitCode === 0) {
                            const fetch = spawn('git', ['--git-dir', gitDirectory, 'fetch', 'upstream', params.baseBranch]);

                            fetch.on('close', (fetchExitCode: number) => {
                                if (fetchExitCode === 0) {
                                    resolve(directory);
                                } else {
                                    fs.rm(directory, { recursive: true, force: true }, () => {
                                        reject(new Error(`Fetch process exited with code ${fetchExitCode}`));
                                    });
                                }
                            });
                        } else {
                            fs.rm(directory, { recursive: true, force: true }, () => {
                                reject(new Error(`Remote Add process exited with code ${remoteAddExitCode}`));
                            });
                        }
                    });
                } else {
                    fs.rm(directory, { recursive: true, force: true }, () => {
                        reject(new Error(`Clone process exited with code ${cloneExitCode}`));
                    });
                }
            });
        })
    });
}
