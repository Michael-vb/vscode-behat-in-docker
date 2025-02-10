import * as vscode from 'vscode';

export class TestErrorParser {
    public parseErrorMessages(output: string, test: vscode.TestItem): vscode.TestMessage[] {
        const messages: vscode.TestMessage[] = [];

        const testMessage = new vscode.TestMessage(output);
        if (test.uri && test.range) {
            testMessage.location = new vscode.Location(test.uri, test.range);
        } else if (test.uri) {
            testMessage.location = new vscode.Location(test.uri, new vscode.Position(0, 0));
        }
        messages.push(testMessage);

        return messages;
    }

    public getErrorOutput(error: any): string {
        let output = '';
        if (error.stdout) {
            output += error.stdout;
        }
        if (error.stderr) {
            output += error.stderr;
        }
        if (!output) {
            output = error.message || 'Test execution failed';
        }
        return output;
    }
} 
