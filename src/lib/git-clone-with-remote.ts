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
        const directory = path.join(process.cwd(), 'pull-requests', hash);

        fs.mkdir(directory, { recursive: true }, (error: Error | null) => {
            if (error !== null) {
                reject(error);

                return;
            }

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

            const result = [];

            clone.stdout.on('data', (data: Buffer) => {
                result.push(`stdout: ${data.toString('utf-8')}`);
            });

            clone.stderr.on('data', (data: Buffer) => {
                result.push(`stderr: ${data.toString('utf-8')}`);
            });

            clone.on('close', (cloneExitCode: number) => {
                console.log(result.join('\n'));

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
