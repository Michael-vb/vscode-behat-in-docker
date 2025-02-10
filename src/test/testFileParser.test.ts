import * as assert from 'assert';
import * as vscode from 'vscode';
import { TestFileParser } from '../testFileParser';
import { beforeEach, afterEach } from 'mocha';
import * as sinon from 'sinon';

suite('TestFileParser', () => {
    let outputChannel: vscode.OutputChannel;
    let testController: vscode.TestController;
    let parser: TestFileParser;
    let mockTestItem: vscode.TestItem;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Setup mocks using Sinon
        outputChannel = {
            appendLine: sandbox.stub()
        } as any as vscode.OutputChannel;

        testController = {
            createTestItem: sandbox.stub().callsFake((id: string, label: string, uri?: vscode.Uri) => {
                return {
                    id,
                    label,
                    uri,
                    canResolveChildren: false,
                } as vscode.TestItem;
            }),
        } as any as vscode.TestController;

        parser = new TestFileParser(outputChannel, testController);

        // Create mock test item
        mockTestItem = {
            id: 'test1',
            uri: vscode.Uri.file('/tmp/sample.feature'),
            children: {
                replace: sandbox.stub(),
                add: sandbox.stub(),
                size: 0,
            },
            label: '',
            canResolveChildren: false,
        } as any as vscode.TestItem;

        // Mock vscode.workspace.openTextDocument to return a feature file content
        sandbox.stub(vscode.workspace, 'openTextDocument').callsFake(async (uri) => {
            return {
                getText: () => {
                    return `Feature: Sample Feature
  Scenario: User logs in
    Given I am on the login page
    When I submit valid credentials
    Then I should see the dashboard

  Scenario Outline: Failed login
    Given I am on the login page
    When I submit invalid credentials
    Then I should see an error message
`;
                }
            } as any;
        });
    });

    test('should parse feature title and scenarios from feature file', async () => {
        const addStub = sandbox.stub();
        (mockTestItem as any).children = {
            replace: sandbox.stub(),
            add: addStub
        };

        await parser.parseTestFile(mockTestItem);

        // Expect feature label to be "Feature: Sample Feature"
        assert.strictEqual(mockTestItem.label, 'Feature: Sample Feature');
        assert.strictEqual(mockTestItem.canResolveChildren, true);
        // Expect two scenarios to be added
        assert.strictEqual(addStub.callCount, 2);

        // First scenario should be "Scenario: User logs in"
        const firstScenario = addStub.firstCall.args[0];
        assert.ok(firstScenario.id.includes('User logs in'));
        assert.strictEqual(firstScenario.label, 'Scenario: User logs in');
        // Second scenario should be "Scenario Outline: Failed login"
        const secondScenario = addStub.secondCall.args[0];
        assert.ok(secondScenario.id.includes('Failed login'));
        assert.strictEqual(secondScenario.label, 'Scenario Outline: Failed login');

        // Assert that the feature range is set correctly (line 0)
        const featureRange = mockTestItem.range as vscode.Range;
        assert.ok(featureRange, "Feature range should be defined");
        assert.strictEqual(featureRange.start.line, 0);
        assert.strictEqual(featureRange.start.character, 0);
        // Check that the end character equals the length of "Feature: Sample Feature"
        const featureLine = "Feature: Sample Feature";
        assert.strictEqual(featureRange.end.line, 0);
        assert.strictEqual(featureRange.end.character, featureLine.length);

        // Optionally, check the range for the first scenario (should be on line 1)
        const scenarioRange = firstScenario.range as vscode.Range;
        assert.ok(scenarioRange, "Scenario range should be defined");
        assert.strictEqual(scenarioRange.start.line, 1);
        assert.strictEqual(scenarioRange.start.character, 0);
        assert.strictEqual(scenarioRange.end.character, "Scenario: User logs in".length);
    });

    test('should default feature label and range when no "Feature:" line exists', async () => {
        // Override the openTextDocument stub to return content without a "Feature:" line
        (vscode.workspace.openTextDocument as sinon.SinonStub).restore();
        sandbox.stub(vscode.workspace, 'openTextDocument').resolves({
            getText: () => {
                return `Random text line
Another line without the feature keyword`;
            }
        } as any);

        await parser.parseTestFile(mockTestItem);

        // The label should default to the file basename.
        assert.strictEqual(mockTestItem.label, 'Feature: sample.feature');

        // The range should default to (0,0) -> (0,0)
        const r = mockTestItem.range as vscode.Range;
        assert.strictEqual(r.start.line, 0);
        assert.strictEqual(r.start.character, 0);
        assert.strictEqual(r.end.line, 0);
        assert.strictEqual(r.end.character, 0);
    });

    test('should handle file read errors gracefully', async () => {
        const openTextDocumentStub = vscode.workspace.openTextDocument as sinon.SinonStub;
        openTextDocumentStub.restore();
        
        sandbox.stub(vscode.workspace, 'openTextDocument').rejects(new Error('File not found'));

        const appendLineStub = sandbox.stub();
        (outputChannel as any).appendLine = appendLineStub;

        await parser.parseTestFile(mockTestItem);
        
        assert.strictEqual(
            appendLineStub.calledWith(sinon.match(/^Error parsing feature file:/)),
            true
        );
    });

    afterEach(() => {
        sandbox.restore();
    });
}); 
