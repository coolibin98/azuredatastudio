/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import type * as azdata from 'azdata';
import { VSBuffer } from 'vs/base/common/buffer';
import { NotebookCellKind } from 'vs/workbench/api/common/extHostTypes';
import { CancellationTokenSource } from 'vs/base/common/cancellation';
import { OutputTypes } from 'sql/workbench/services/notebook/common/contracts';

export class VSCodeContentManager implements azdata.nb.ContentManager {
	constructor(private readonly _serializer: vscode.NotebookSerializer) {
	}

	public async deserializeNotebook(contents: string): Promise<azdata.nb.INotebookContents> {
		let buffer = VSBuffer.fromString(contents);
		let notebookData = await this._serializer.deserializeNotebook(buffer.buffer, new CancellationTokenSource().token);
		return {
			cells: notebookData.cells.map<azdata.nb.ICellContents>(cell => {
				return {
					cell_type: cell.kind === NotebookCellKind.Code ? 'code' : 'markdown',
					source: cell.value,
					metadata: {
						language: cell.languageId
					},
					execution_count: cell.executionSummary?.executionOrder,
					outputs: cell.outputs?.map<azdata.nb.IExecuteResult>(output => {
						let outputData = {};
						for (let item of output.items) {
							outputData[item.mime] = VSBuffer.wrap(item.data).toString();
						}
						return {
							output_type: 'execute_result',
							data: outputData,
							execution_count: cell.executionSummary?.executionOrder,
							metadata: output.metadata,
							id: output.id
						};
					})
				};
			}),
			metadata: notebookData.metadata ?? {},
			nbformat: notebookData['nbformat'] ?? 4,
			nbformat_minor: notebookData['nbformat_minor'] ?? 2
		};
	}

	public static convertToVscodeCellOutput(output: azdata.nb.ICellOutput): vscode.NotebookCellOutputItem[] {
		switch (output.output_type) {
			case OutputTypes.ExecuteResult:
			case OutputTypes.DisplayData:
			case OutputTypes.UpdateDisplayData:
				let displayOutput = output as azdata.nb.IDisplayResult;
				return Object.keys(displayOutput.data).map<vscode.NotebookCellOutputItem>(key => {
					return {
						mime: key,
						data: VSBuffer.fromString(displayOutput.data[key]).buffer
					};
				});
			case OutputTypes.Stream:
				let streamOutput = output as azdata.nb.IStreamResult;
				return [{
					mime: 'text/html',
					data: VSBuffer.fromString(Array.isArray(streamOutput.text) ? streamOutput.text.join('') : streamOutput.text).buffer
				}];
			case OutputTypes.Error:
				let errorOutput = output as azdata.nb.IErrorResult;
				let errorString = errorOutput.ename + ': ' + errorOutput.evalue + (errorOutput.traceback ? '\n' + errorOutput.traceback?.join('\n') : '');
				return [{
					mime: 'text/html',
					data: VSBuffer.fromString(errorString).buffer
				}];
		}
	}

	public async serializeNotebook(notebook: azdata.nb.INotebookContents): Promise<string> {
		let notebookData: vscode.NotebookData = {
			cells: notebook.cells.map<vscode.NotebookCellData>(cell => {
				return {
					kind: cell.cell_type === 'code' ? NotebookCellKind.Code : NotebookCellKind.Markup,
					value: Array.isArray(cell.source) ? cell.source.join('\n') : cell.source,
					languageId: cell.metadata?.language,
					outputs: cell.outputs.map<vscode.NotebookCellOutput>(output => {
						return {
							items: VSCodeContentManager.convertToVscodeCellOutput(output),
							metadata: output.metadata,
							id: output.id
						};
					}),
					executionSummary: {
						executionOrder: cell.execution_count
					}
				};
			}),
			metadata: notebook.metadata
		};
		let bytes = await this._serializer.serializeNotebook(notebookData, new CancellationTokenSource().token);
		let buffer = VSBuffer.wrap(bytes);
		return buffer.toString();
	}
}

class VSCodeSerializationManager implements azdata.nb.SerializationManager {
	private _manager: VSCodeContentManager;

	constructor(serializer: vscode.NotebookSerializer) {
		this._manager = new VSCodeContentManager(serializer);
	}

	public get contentManager(): azdata.nb.ContentManager {
		return this._manager;
	}
}

export class VSCodeSerializationProvider implements azdata.nb.NotebookSerializationProvider {
	private _manager: VSCodeSerializationManager;

	constructor(private readonly _providerId: string, serializer: vscode.NotebookSerializer) {
		this._manager = new VSCodeSerializationManager(serializer);
	}

	public get providerId(): string {
		return this._providerId;
	}

	public getSerializationManager(notebookUri: vscode.Uri): Thenable<azdata.nb.SerializationManager> {
		return Promise.resolve(this._manager);
	}
}
