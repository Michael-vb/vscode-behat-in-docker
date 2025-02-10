import * as assert from 'assert';
import * as vscode from 'vscode';
import { TestErrorParser } from '../testErrorParser';

suite('TestErrorParser', () => {
    let parser: TestErrorParser;
    let mockTestItem: vscode.TestItem;

    setup(() => {
        parser = new TestErrorParser();
        mockTestItem = {
            id: 'test1',
            uri: vscode.Uri.file('/path/to/test.feature'),
            label: 'TestClass',
            range: new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 5))
        } as vscode.TestItem;
    });

    suite('parseErrorMessages', () => {
        test('should set message to the output and location to test item location', () => {
            const output = 'Some error message';
            const messages = parser.parseErrorMessages(output, mockTestItem);

            assert.strictEqual(messages.length, 1);
            assert.strictEqual(messages[0].message, output);
            assert.deepStrictEqual(messages[0].location, new vscode.Location(mockTestItem.uri!, mockTestItem.range!));
        });

        test('should handle empty output', () => {
            const messages = parser.parseErrorMessages('', mockTestItem);
            assert.strictEqual(messages.length, 1);
            assert.strictEqual(messages[0].message, '');
            assert.deepStrictEqual(messages[0].location, new vscode.Location(mockTestItem.uri!, mockTestItem.range!));
        });

        test('should handle test item without range', () => {
            const output = 'Another error';
            const mockTestItemWithoutRange = {
                id: 'test2',
                uri: vscode.Uri.file('/path/to/another_test.feature'),
                label: 'AnotherTest'
            } as vscode.TestItem;
            const messages = parser.parseErrorMessages(output, mockTestItemWithoutRange);
            assert.strictEqual(messages.length, 1);
            assert.strictEqual(messages[0].message, output);
            assert.deepStrictEqual(messages[0].location, new vscode.Location(mockTestItemWithoutRange.uri!, new vscode.Position(0, 0)));
        });
    });

    suite('getErrorOutput', () => {
        test('should combine stdout and stderr', () => {
            const error = {
                stdout: 'Standard output\n',
                stderr: 'Error output'
            };
            const output = parser.getErrorOutput(error);
            assert.strictEqual(output, 'Standard output\nError output');
        });

        test('should handle stdout only', () => {
            const error = {
                stdout: 'Standard output'
            };
            const output = parser.getErrorOutput(error);
            assert.strictEqual(output, 'Standard output');
        });

        test('should handle stderr only', () => {
            const error = {
                stderr: 'Error output'
            };
            const output = parser.getErrorOutput(error);
            assert.strictEqual(output, 'Error output');
        });

        test('should use error message if no output', () => {
            const error = {
                message: 'Error message'
            };
            const output = parser.getErrorOutput(error);
            assert.strictEqual(output, 'Error message');
        });

        test('should use default message if no error info', () => {
            const error = {};
            const output = parser.getErrorOutput(error);
            assert.strictEqual(output, 'Test execution failed');
        });
    });
}); 
