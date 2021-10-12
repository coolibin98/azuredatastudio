/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import type * as azdata from 'azdata';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { INotebookKernelDto2 } from 'vs/workbench/api/common/extHost.protocol';
import { Emitter } from 'vs/base/common/event';
import * as extHostTypeConverters from 'vs/workbench/api/common/extHostTypeConverters';
import { Registry } from 'vs/platform/registry/common/platform';
import { INotebookProviderRegistry, NotebookProviderRegistryId } from 'sql/workbench/services/notebook/common/notebookRegistry';

const notebookRegistry = Registry.as<INotebookProviderRegistry>(NotebookProviderRegistryId);

class VSCodeSession implements azdata.nb.ISession {
	constructor(_controller: vscode.NotebookController, _options: azdata.nb.ISessionOptions) {

	}

	public get canChangeKernels(): boolean {
		throw new Error('Method not implemented.');
	}

	public get id(): string {
		throw new Error('Method not implemented.');
	}

	public get path(): string {
		throw new Error('Method not implemented.');
	}

	public get name(): string {
		throw new Error('Method not implemented.');
	}

	public get type(): string {
		throw new Error('Method not implemented.');
	}

	public get status(): azdata.nb.KernelStatus {
		throw new Error('Method not implemented.');
	}

	public get kernel(): azdata.nb.IKernel {
		throw new Error('Method not implemented.');
	}

	public get defaultKernelLoaded(): boolean | undefined {
		throw new Error('Method not implemented.');
	}

	public changeKernel(kernelInfo: azdata.nb.IKernelSpec): Thenable<azdata.nb.IKernel> {
		throw new Error('Method not implemented.');
	}

	public configureKernel(kernelInfo: azdata.nb.IKernelSpec): Thenable<void> {
		throw new Error('Method not implemented.');
	}

	public configureConnection(connection: azdata.IConnectionProfile): Thenable<void> {
		throw new Error('Method not implemented.');
	}
}

class VSCodeSessionManager implements azdata.nb.SessionManager {
	private _sessions: azdata.nb.ISession[] = [];

	constructor(private readonly _controller: vscode.NotebookController) {
	}

	public get isReady(): boolean {
		return true;
	}

	public get ready(): Thenable<void> {
		return Promise.resolve();
	}

	public get specs(): azdata.nb.IAllKernels {
		let languages = this._controller.supportedLanguages?.length > 0 ? this._controller.supportedLanguages : [this._controller.label];
		return {
			defaultKernel: languages[0],
			kernels: languages.map<azdata.nb.IKernelSpec>(language => {
				return {
					name: language
				};
			})
		};
	}

	public startNew(options: azdata.nb.ISessionOptions): Thenable<azdata.nb.ISession> {
		let session: azdata.nb.ISession = new VSCodeSession(this._controller, options);
		let index = this._sessions.findIndex(session => session.path === options.path);
		if (index > -1) {
			this._sessions.splice(index);
		}
		this._sessions.push(session);
		return Promise.resolve(session);
	}

	public shutdown(id: string): Thenable<void> {
		let index = this._sessions.findIndex(session => session.id === id);
		if (index > -1) {
			this._sessions.splice(index);
		}
		return Promise.resolve();
	}

	public shutdownAll(): Thenable<void> {
		return Promise.all(this._sessions.map(session => {
			return this.shutdown(session.id);
		})).then();
	}

	public dispose(): void {
		this._controller.dispose();
	}
}

class VSCodeExecuteManager implements azdata.nb.ExecuteManager {
	private readonly _sessionManager: azdata.nb.SessionManager;

	constructor(private readonly _controller: vscode.NotebookController) {
		this._sessionManager = new VSCodeSessionManager(this._controller);
	}

	public get sessionManager(): azdata.nb.SessionManager {
		return this._sessionManager;
	}

	public get serverManager(): azdata.nb.ServerManager | undefined {
		return undefined;
	}
}

export class VSCodeExecuteProvider implements azdata.nb.NotebookExecuteProvider {
	private readonly _executeManager: azdata.nb.ExecuteManager;

	constructor(private readonly _controller: vscode.NotebookController) {
		this._executeManager = new VSCodeExecuteManager(this._controller);
	}

	public get providerId(): string {
		return this._controller.id;
	}

	public getExecuteManager(notebookUri: vscode.Uri): Thenable<azdata.nb.ExecuteManager> {
		return Promise.resolve(this._executeManager);
	}

	public handleNotebookClosed(notebookUri: vscode.Uri): void {
		// No-op
	}
}

export class ADSNotebookController implements vscode.NotebookController {
	private readonly _kernelData: INotebookKernelDto2;
	private _interruptHandler: (notebook: vscode.NotebookDocument) => void | Thenable<void>;

	private readonly _onDidChangeSelection = new Emitter<{ selected: boolean, notebook: vscode.NotebookDocument; }>();
	private readonly _onDidReceiveMessage = new Emitter<{ editor: vscode.NotebookEditor, message: any; }>();

	constructor(
		private _extension: IExtensionDescription,
		private _id: string,
		private _viewType: string,
		private _label: string,
		private _handler?: (cells: vscode.NotebookCell[], notebook: vscode.NotebookDocument, controller: vscode.NotebookController) => void | Thenable<void>,
		preloads?: vscode.NotebookRendererScript[]
	) {
		this._kernelData = {
			id: `${this._extension.identifier.value}/${this._id}`,
			notebookType: this._viewType,
			extensionId: this._extension.identifier,
			extensionLocation: this._extension.extensionLocation,
			label: this._label || this._extension.identifier.value,
			preloads: preloads ? preloads.map(extHostTypeConverters.NotebookRendererScript.from) : []
		};
	}

	public get id() { return this._id; }

	public get notebookType() { return this._viewType; }

	public get onDidChangeSelectedNotebooks() {
		return this._onDidChangeSelection.event;
	}

	public get onDidReceiveMessage() {
		return this._onDidReceiveMessage.event;
	}

	public get label() {
		return this._kernelData.label;
	}

	public set label(value) {
		this._kernelData.label = value ?? this._extension.displayName ?? this._extension.name;
	}

	public get detail() {
		return this._kernelData.detail ?? '';
	}

	public set detail(value) {
		this._kernelData.detail = value;
	}

	public get description() {
		return this._kernelData.description ?? '';
	}

	public set description(value) {
		this._kernelData.description = value;
	}

	public get supportedLanguages() {
		return this._kernelData.supportedLanguages;
	}

	public set supportedLanguages(value) {
		this._kernelData.supportedLanguages = value;
		notebookRegistry.updateProviderDescriptionLanguages(this._id, value);
	}

	public get supportsExecutionOrder() {
		return this._kernelData.supportsExecutionOrder ?? false;
	}

	public set supportsExecutionOrder(value) {
		this._kernelData.supportsExecutionOrder = value;
	}

	public get rendererScripts() {
		return this._kernelData.preloads ? this._kernelData.preloads.map(extHostTypeConverters.NotebookRendererScript.to) : [];
	}

	public get executeHandler() {
		return this._handler;
	}

	public set executeHandler(value) {
		this._handler = value;
	}

	public get interruptHandler() {
		return this._interruptHandler;
	}

	public set interruptHandler(value) {
		this._interruptHandler = value;
		this._kernelData.supportsInterrupt = Boolean(value);
	}

	public createNotebookCellExecution(cell: vscode.NotebookCell): vscode.NotebookCellExecution {
		return new ADSNotebookCellExecution(cell);
	}

	public dispose(): void {
		// No-op
	}

	public updateNotebookAffinity(notebook: vscode.NotebookDocument, affinity: vscode.NotebookControllerAffinity): void {
		throw new Error('Method not implemented.');
	}

	public postMessage(message: any, editor?: vscode.NotebookEditor): Thenable<boolean> {
		throw new Error('Method not implemented.');
	}

	public asWebviewUri(localResource: vscode.Uri): vscode.Uri {
		throw new Error('Method not implemented.');
	}
}

class ADSNotebookCellExecution implements vscode.NotebookCellExecution {
	constructor(cell: vscode.NotebookCell) {

	}

	cell: vscode.NotebookCell;
	token: vscode.CancellationToken;
	executionOrder: number;
	start(startTime?: number): void {
		throw new Error('Method not implemented.');
	}
	end(success: boolean, endTime?: number): void {
		throw new Error('Method not implemented.');
	}
	clearOutput(cell?: vscode.NotebookCell): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	replaceOutput(out: vscode.NotebookCellOutput | vscode.NotebookCellOutput[], cell?: vscode.NotebookCell): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	appendOutput(out: vscode.NotebookCellOutput | vscode.NotebookCellOutput[], cell?: vscode.NotebookCell): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	replaceOutputItems(items: vscode.NotebookCellOutputItem | vscode.NotebookCellOutputItem[], output: vscode.NotebookCellOutput): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	appendOutputItems(items: vscode.NotebookCellOutputItem | vscode.NotebookCellOutputItem[], output: vscode.NotebookCellOutput): Thenable<void> {
		throw new Error('Method not implemented.');
	}
}