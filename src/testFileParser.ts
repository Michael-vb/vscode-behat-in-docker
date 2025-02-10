import * as vscode from 'vscode';
import * as path from 'path';

export class TestFileParser {
    constructor(
        private outputChannel: vscode.OutputChannel,
        private testController: vscode.TestController
    ) {}

    public async parseTestFile(testItem: vscode.TestItem): Promise<void> {
        if (!testItem.uri) { return; }
        
        if (testItem.children) {
            testItem.children.replace([]);
        }

        try {
            this.outputChannel.appendLine(`Parsing feature file: ${testItem.uri.fsPath}`);
            
            const document = await vscode.workspace.openTextDocument(testItem.uri);
            const text = document.getText();
            const lines = text.split('\n');
            
            // Set the default title and feature line number
            let featureTitle = path.basename(testItem.uri.fsPath);
            let featureLine: number | undefined = undefined;
            
            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (trimmed.startsWith('Feature:')) {
                    featureTitle = trimmed.replace('Feature:', '').trim();
                    featureLine = i;
                    break;
                }
            }
            
            // Prefix the label with "Feature: "
            testItem.label = `Feature: ${featureTitle}`;
            testItem.canResolveChildren = true;
            
            // Set the range based on the Feature line location
            if (featureLine !== undefined) {
                testItem.range = new vscode.Range(
                    new vscode.Position(featureLine, 0),
                    new vscode.Position(featureLine, lines[featureLine].length)
                );
            } else {
                // Default to the start of the file if no Feature line is found
                testItem.range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
            }
            
            this.outputChannel.appendLine(`Found feature: ${featureTitle}`);

            // Find all scenarios in the feature file
            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:')) {
                    let scenarioDesc = '';
                    let prefix = '';  // Store the prefix here
                    if (trimmed.startsWith('Scenario:')) {
                        scenarioDesc = trimmed.substring(9).trim();
                        prefix = 'Scenario: ';
                    } else {
                        scenarioDesc = trimmed.substring('Scenario Outline:'.length).trim();
                        prefix = 'Scenario Outline: ';
                    }
                    const scenarioId = `${testItem.id}::${scenarioDesc}`;
                    // Prefix label with "Scenario: " or "Scenario Outline: "
                    const scenarioItem = this.testController.createTestItem(
                        scenarioId,
                        `${prefix}${scenarioDesc}`, // Use the prefix and description
                        testItem.uri
                    );
                    
                    scenarioItem.canResolveChildren = false;
                    
                    scenarioItem.range = new vscode.Range(
                        new vscode.Position(i, 0),
                        new vscode.Position(i, trimmed.length)
                    );
                    testItem.children.add(scenarioItem);
                    this.outputChannel.appendLine(`Found scenario: ${scenarioDesc} at line ${i + 1}`);
                }
            }
        } catch (err) {
            this.outputChannel.appendLine(`Error parsing feature file: ${err}`);
        }
    }
} 
