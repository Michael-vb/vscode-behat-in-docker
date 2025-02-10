// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DockerBehatTestController } from './testController';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Activating Behat Docker extension');
	
	// Create output channel for better logging
	const outputChannel = vscode.window.createOutputChannel('Behat Docker');
	outputChannel.appendLine('Behat Docker extension is now active');
	
	// Create and register the controller
	const controller = new DockerBehatTestController(outputChannel);
	context.subscriptions.push(controller);
	
	outputChannel.appendLine('Behat Docker extension initialization complete');
}

// This method is called when your extension is deactivated
export function deactivate() {}
