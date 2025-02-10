import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TestRunner } from '../testRunner';

suite('TestRunner', () => {
    let testRunner: TestRunner;
    let testController: vscode.TestController;
    let outputChannel: vscode.OutputChannel;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock VSCode test controller
        testController = {
            createTestRun: sandbox.stub().returns({
                started: sandbox.stub(),
                passed: sandbox.stub(),
                failed: sandbox.stub(),
                end: sandbox.stub(),
                appendOutput: sandbox.stub()
            }),
            items: new Map()
        } as unknown as vscode.TestController;

        // Mock output channel
        outputChannel = {
            appendLine: sandbox.stub()
        } as unknown as vscode.OutputChannel;

        testRunner = new TestRunner(testController, outputChannel);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('runTests should show error when container name is not configured', async () => {
        sandbox.stub(vscode.workspace, 'getConfiguration')
            .returns({
                get: sandbox.stub().returns(undefined)
            } as any);

        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage')
            .resolves(undefined);

        const request = {} as vscode.TestRunRequest;
        const token = { isCancellationRequested: false } as vscode.CancellationToken;

        await testRunner.runTests(request, token, false);

        assert.strictEqual(showErrorStub.calledOnce, true);
        assert.strictEqual(
            showErrorStub.firstCall.args[0],
            'Docker container name is not configured. Please configure it in settings.'
        );
    });

    test('runTests should execute tests successfully', async () => {
        sandbox.stub(vscode.workspace, 'getConfiguration')
            .returns({
                get: sandbox.stub().callsFake((key: string) => {
                    if (key === 'containerName') {return 'test-container';}
                    if (key === 'containerPath') {return '/var/www';}
                    if (key === 'behatPath') {return 'vendor/bin/behat';}
                    return undefined;
                })
            } as any);

        const testItem = {
            id: 'TestFeature::User logs in',
            uri: vscode.Uri.file('/workspace/features/TestFeature.feature'),
            range: new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 0))
        } as vscode.TestItem;

        sandbox.stub(vscode.workspace, 'asRelativePath')
            .returns('features/TestFeature.feature');

        const execStub = sandbox.stub().resolves({
            stdout: 'All scenarios passed',
            stderr: ''
        });
        testRunner.setExecCommand(execStub);

        const request = {
            include: [testItem]
        } as unknown as vscode.TestRunRequest;
        const token = { isCancellationRequested: false } as vscode.CancellationToken;

        await testRunner.runTests(request, token, false);

        const run = (testController.createTestRun as sinon.SinonStub).getCall(0).returnValue;
        sinon.assert.calledWith(run.started, sinon.match.same(testItem));
        sinon.assert.calledWith(run.passed, sinon.match.same(testItem));
        sinon.assert.calledOnce(run.end);

        assert.strictEqual(execStub.calledOnce, true);
        assert.strictEqual(
            execStub.firstCall.args[0],
            'docker exec -t test-container php vendor/bin/behat --no-interaction --strict /var/www/features/TestFeature.feature:11'
        );
    });

    test('runTests should handle test failures', async () => {
        sandbox.stub(vscode.workspace, 'getConfiguration')
            .returns({
                get: sandbox.stub().returns('test-container')
            } as any);

        const testItem = {
            id: 'TestFeature::User logs in',
            uri: vscode.Uri.file('/workspace/features/TestFeature.feature'),
            range: new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 0))
        } as vscode.TestItem;

        sandbox.stub(vscode.workspace, 'asRelativePath')
            .returns('features/TestFeature.feature');

        const execError = new Error('Test failed');
        (execError as any).stdout = 'Failure output';
        (execError as any).stderr = 'Failure error';
        const execStub = sandbox.stub().rejects(execError);
        testRunner.setExecCommand(execStub);

        const request = {
            include: [testItem]
        } as unknown as vscode.TestRunRequest;
        const token = { isCancellationRequested: false } as vscode.CancellationToken;

        await testRunner.runTests(request, token, false);

        const run = (testController.createTestRun as sinon.SinonStub).getCall(0).returnValue;
        sinon.assert.calledWith(run.started, sinon.match.same(testItem));
        sinon.assert.calledWith(run.failed, sinon.match.same(testItem));
        sinon.assert.calledOnce(run.end);
    });

    test('runTests should normalize container paths in output', async () => {
        sandbox.stub(vscode.workspace, 'getConfiguration')
            .returns({
                get: sandbox.stub().callsFake((key: string) => {
                    if (key === 'containerName') {return 'test-container';}
                    if (key === 'containerPath') {return '/var/www';}
                    if (key === 'behatPath') {return 'vendor/bin/behat';}
                    return undefined;
                })
            } as any);

        const testItem = {
            id: 'TestFeature::User logs in',
            uri: vscode.Uri.file('/workspace/features/TestFeature.feature'),
            range: new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 0))
        } as vscode.TestItem;

        sandbox.stub(vscode.workspace, 'asRelativePath')
            .returns('features/TestFeature.feature');

        const execStub = sandbox.stub().rejects({
            message: 'Test failed',
            stdout: 'Error in /var/www/features/TestFeature.feature:15',
            stderr: ''
        });
        testRunner.setExecCommand(execStub);

        const request = {
            include: [testItem]
        } as unknown as vscode.TestRunRequest;
        const token = { isCancellationRequested: false } as vscode.CancellationToken;

        await testRunner.runTests(request, token, false);

        const run = (testController.createTestRun as sinon.SinonStub).getCall(0).returnValue;
        sinon.assert.calledWith(
            run.appendOutput,
            sinon.match((output: string) => output.includes('features/TestFeature.feature:15') && !output.includes('/var/www/'))
        );
    });
});
