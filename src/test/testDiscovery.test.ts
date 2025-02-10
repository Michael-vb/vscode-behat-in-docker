import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TestDiscovery } from '../testDiscovery';
import { beforeEach, afterEach } from 'mocha';

suite('TestDiscovery', () => {
    let testController: vscode.TestController;
    let outputChannel: vscode.OutputChannel;
    let testDiscovery: TestDiscovery;
    let workspaceFolders: vscode.WorkspaceFolder[];
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Setup test controller with sinon stubs
        testController = {
            items: {
                replace: sandbox.stub().callsFake((items: readonly vscode.TestItem[]) => {}),
                add: sandbox.stub(),
                get: sandbox.stub(),
                delete: sandbox.stub()
            },
            createTestItem: sandbox.stub().callsFake((id: string, label: string, uri: vscode.Uri) => ({
                id,
                label,
                uri,
                canResolveChildren: true,
                children: {
                    replace: sandbox.stub(),
                    add: sandbox.stub(),
                    get: sandbox.stub()
                }
            }))
        } as any;

        outputChannel = {
            appendLine: sandbox.stub()
        } as any;

        workspaceFolders = [{
            uri: vscode.Uri.file('/project'),
            name: 'project',
            index: 0
        }];

        // Mock workspace functions using sinon
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: sandbox.stub().returns('**/*.feature')
        } as any);
        
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file('/project/features/Example.feature'),
            vscode.Uri.file('/project/features/Another.feature')
        ]);

        sandbox.stub(vscode.workspace, 'workspaceFolders').value(workspaceFolders);

        testDiscovery = new TestDiscovery(testController, outputChannel);
    });

    test('should discover all feature files', async () => {
        await testDiscovery.discoverAllTests();

        sinon.assert.calledWith(testController.items.replace as sinon.SinonStub, []);
        assert.strictEqual((testController.items.add as sinon.SinonStub).callCount, 2);
        sinon.assert.calledWith(
            testController.items.add as sinon.SinonStub, 
            sinon.match({ id: '/project/features/Example.feature' })
        );
        sinon.assert.calledWith(
            testController.items.add as sinon.SinonStub,
            sinon.match({ id: '/project/features/Another.feature' })
        );
    });

    test('should handle no feature files found', async () => {
        (vscode.workspace.findFiles as sinon.SinonStub).resolves([]);

        await testDiscovery.discoverAllTests();

        sinon.assert.calledOnce(testController.items.replace as sinon.SinonStub);
    });

    test('should add test for file', async () => {
        const uri = vscode.Uri.file('/project/features/New.feature');

        await testDiscovery.addTestForFile(uri);

        sinon.assert.calledWith(
            testController.items.add as sinon.SinonStub,
            sinon.match({
                label: 'New.feature',
                uri: uri
            })
        );
    });

    test('should update existing test item', async () => {
        const uri = vscode.Uri.file('/project/features/Existing.feature');
        const testItem = {
            id: uri.fsPath,
            label: 'Existing.feature',
            uri,
            children: {
                replace: sandbox.stub()
            }
        };
        
        (testController.items.get as sinon.SinonStub).returns(testItem);

        await testDiscovery.updateTestForFile(uri);

        sinon.assert.calledOnce(testItem.children.replace as sinon.SinonStub);
    });

    test('should remove test for file', () => {
        const uri = vscode.Uri.file('/project/features/Remove.feature');

        testDiscovery.removeTestForFile(uri);

        sinon.assert.calledWith(testController.items.delete as sinon.SinonStub, uri.fsPath);
    });

    afterEach(() => {
        sandbox.restore();
    });
});
