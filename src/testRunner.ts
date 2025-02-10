import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { TestErrorParser } from './testErrorParser';
import { normalizeContainerPaths } from './utils/pathNormalizer';

export class TestRunner {
    private errorParser: TestErrorParser;
    private execCommand: (command: string) => Promise<{ stdout: string; stderr: string }>;

    constructor(
        private testController: vscode.TestController,
        private outputChannel: vscode.OutputChannel
    ) {
        this.errorParser = new TestErrorParser();
        this.execCommand = promisify(exec);
    }

    public async runTests(
        request: vscode.TestRunRequest,
        token: vscode.CancellationToken,
        isDebug: boolean
    ) {
        const run = this.testController.createTestRun(request);
        const config = vscode.workspace.getConfiguration('behatDocker');
        
        const containerName = config.get<string>('containerName');
        const containerPath = config.get<string>('containerPath') || '/var/www';
        const behatPath = config.get<string>('behatPath') || 'vendor/bin/behat';

        let debugSessionToStop: vscode.DebugSession | undefined;

        if (!containerName) {
            const message = 'Docker container name is not configured. Please configure it in settings.';
            vscode.window.showErrorMessage(message, 'Open Settings').then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'behatDocker.containerName');
                }
            });
            run.end();
            return;
        }

        if (isDebug) {
            const debugSession = vscode.debug.activeDebugSession;
            if (!debugSession) {
                try {
                    this.outputChannel.appendLine('Starting debug session...');
                    const debugConfig = config.get<object>('debugConfiguration') || {
                        type: 'php',
                        name: 'Listen for Xdebug',
                        request: 'launch',
                        port: 9003,
                        pathMappings: {
                            [containerPath]: "${workspaceFolder}"
                        }
                    };
                    await vscode.debug.startDebugging(undefined, debugConfig as any);
                    debugSessionToStop = vscode.debug.activeDebugSession;
                } catch (error) {
                    this.outputChannel.appendLine(`Failed to start debug session: ${error}`);
                    run.end();
                    return;
                }
            }
        }

        const testsToRun: vscode.TestItem[] = [];
        if (request.include) {
            testsToRun.push(...request.include);
        } else {
            this.testController.items.forEach(item => testsToRun.push(item));
        }

        await this.executeTests(testsToRun, run, token, {
            containerName,
            containerPath,
            behatPath,
            isDebug
        });

        run.end();

        if (debugSessionToStop) {
            try {
                this.outputChannel.appendLine('Stopping debug session...');
                await vscode.debug.stopDebugging(debugSessionToStop);
                this.outputChannel.appendLine('Debug session stopped');
            } catch (error) {
                this.outputChannel.appendLine(`Error stopping debug session: ${error}`);
            }
        }
    }

    private async executeTests(
        tests: vscode.TestItem[],
        run: vscode.TestRun,
        token: vscode.CancellationToken,
        options: {
            containerName: string;
            containerPath: string;
            behatPath: string;
            isDebug: boolean;
        }
    ) {
        for (const test of tests) {
            if (token.isCancellationRequested) { return; }

            run.started(test);
            try {
                const relativePath = vscode.workspace.asRelativePath(test.uri!);
                const containerFilePath = path.join(options.containerPath, relativePath);
                
                let behatCommand = `php ${options.behatPath} --no-interaction --strict`;
                if (options.isDebug) {
                    behatCommand = `php -dxdebug.mode=debug ${options.behatPath} --no-interaction --strict`;
                }
                if (test.id.includes('::')) {
                    const lineNumber = test.range ? test.range.start.line + 1 : 1;
                    behatCommand += ` ${containerFilePath}:${lineNumber}`;
                } else {
                    behatCommand += ` ${containerFilePath}`;
                }

                this.outputChannel.appendLine(`Executing command: ${behatCommand}`);
    
                const { stdout, stderr } = await this.execCommand(
                    `docker exec -t ${options.containerName} ${behatCommand}`
                );

                const normalizedOutput = normalizeContainerPaths(stdout, options.containerPath);
                run.appendOutput(normalizedOutput);
                run.passed(test);
                this.outputChannel.appendLine(`Test execution:\n${stdout}`);
            } catch (err: any) {
                const output = this.errorParser.getErrorOutput(err);
                const normalizedOutput = normalizeContainerPaths(output, options.containerPath);
                run.appendOutput(normalizedOutput);

                const messages = this.errorParser.parseErrorMessages(normalizedOutput, test);
                run.failed(test, messages);
                this.outputChannel.appendLine(`Test execution error:\n${output}`);
            }
        }
    }

    public setExecCommand(execCommand: (command: string) => Promise<{ stdout: string; stderr: string }>) {
        this.execCommand = execCommand;
    }
}
