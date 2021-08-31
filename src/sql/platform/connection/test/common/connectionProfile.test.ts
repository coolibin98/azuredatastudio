/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConnectionProfile } from 'sql/platform/connection/common/connectionProfile';
import { IConnectionProfile, IConnectionProfileStore, ServiceOptionType, ConnectionOptionSpecialType } from 'sql/platform/connection/common/interfaces';
import * as azdata from 'azdata';
import * as assert from 'assert';
import { TestCapabilitiesService } from 'sql/platform/capabilities/test/common/testCapabilitiesService';
import { mssqlProviderName } from 'sql/platform/connection/common/constants';
import { ConnectionProviderProperties } from 'sql/platform/capabilities/common/capabilitiesService';

suite('SQL ConnectionProfileInfo tests', () => {
	let msSQLCapabilities: ConnectionProviderProperties;
	let capabilitiesService: TestCapabilitiesService;

	let connectionProfile: IConnectionProfile = {
		connectionName: 'new name',
		serverName: 'new server',
		databaseName: 'database',
		userName: 'user',
		password: 'password',
		authenticationType: '',
		savePassword: true,
		groupFullName: 'g2/g2-2',
		groupId: 'group id',
		getOptionsKey: undefined!,
		matches: undefined!,
		providerName: mssqlProviderName,
		options: {},
		saveProfile: true,
		id: undefined!
	};

	let storedProfile: IConnectionProfileStore = {
		groupId: 'groupId',
		id: 'id',
		options: {
			connectionName: 'new name',
			serverName: 'new server',
			databaseName: 'database',
			userName: 'user',
			password: 'password',
			authenticationType: ''
		},
		providerName: mssqlProviderName,
		savePassword: true
	};

	setup(() => {
		let connectionProvider: azdata.ConnectionOption[] = [
			{
				name: 'connectionName',
				displayName: undefined!,
				description: undefined!,
				groupName: undefined!,
				categoryValues: undefined!,
				defaultValue: undefined!,
				isIdentity: true,
				isRequired: true,
				specialValueType: ConnectionOptionSpecialType.connectionName,
				valueType: ServiceOptionType.string
			},
			{
				name: 'serverName',
				displayName: undefined!,
				description: undefined!,
				groupName: undefined!,
				categoryValues: undefined!,
				defaultValue: undefined!,
				isIdentity: true,
				isRequired: true,
				specialValueType: ConnectionOptionSpecialType.serverName,
				valueType: ServiceOptionType.string
			},
			{
				name: 'databaseName',
				displayName: undefined!,
				description: undefined!,
				groupName: undefined!,
				categoryValues: undefined!,
				defaultValue: undefined!,
				isIdentity: true,
				isRequired: true,
				specialValueType: ConnectionOptionSpecialType.databaseName,
				valueType: ServiceOptionType.string
			},
			{
				name: 'userName',
				displayName: undefined!,
				description: undefined!,
				groupName: undefined!,
				categoryValues: undefined!,
				defaultValue: undefined!,
				isIdentity: true,
				isRequired: true,
				specialValueType: ConnectionOptionSpecialType.userName,
				valueType: ServiceOptionType.string
			},
			{
				name: 'authenticationType',
				displayName: undefined!,
				description: undefined!,
				groupName: undefined!,
				categoryValues: undefined!,
				defaultValue: undefined!,
				isIdentity: true,
				isRequired: true,
				specialValueType: ConnectionOptionSpecialType.authType,
				valueType: ServiceOptionType.string
			},
			{
				name: 'password',
				displayName: undefined!,
				description: undefined!,
				groupName: undefined!,
				categoryValues: undefined!,
				defaultValue: undefined!,
				isIdentity: true,
				isRequired: true,
				specialValueType: ConnectionOptionSpecialType.password,
				valueType: ServiceOptionType.string
			}
		];
		msSQLCapabilities = {
			providerId: mssqlProviderName,
			displayName: 'MSSQL',
			connectionOptions: connectionProvider
		};
		capabilitiesService = new TestCapabilitiesService();
		capabilitiesService.capabilities[mssqlProviderName] = { connection: msSQLCapabilities };
	});

	test('set properties should set the values correctly', () => {
		let conn = new ConnectionProfile(capabilitiesService, undefined!);
		assert.strictEqual(conn.serverName, undefined);
		conn.connectionName = connectionProfile.connectionName!;
		conn.serverName = connectionProfile.serverName;
		conn.databaseName = connectionProfile.databaseName!;
		conn.authenticationType = connectionProfile.authenticationType;
		conn.password = connectionProfile.password;
		conn.userName = connectionProfile.userName;
		conn.groupId = connectionProfile.groupId;
		conn.groupFullName = connectionProfile.groupFullName;
		conn.savePassword = connectionProfile.savePassword;
		assert.strictEqual(conn.connectionName, connectionProfile.connectionName);
		assert.strictEqual(conn.serverName, connectionProfile.serverName);
		assert.strictEqual(conn.databaseName, connectionProfile.databaseName);
		assert.strictEqual(conn.authenticationType, connectionProfile.authenticationType);
		assert.strictEqual(conn.password, connectionProfile.password);
		assert.strictEqual(conn.userName, connectionProfile.userName);
		assert.strictEqual(conn.groupId, connectionProfile.groupId);
		assert.strictEqual(conn.groupFullName, connectionProfile.groupFullName);
		assert.strictEqual(conn.savePassword, connectionProfile.savePassword);
	});

	test('constructor should initialize the options given a valid model', () => {
		let conn = new ConnectionProfile(capabilitiesService, connectionProfile);

		assert.strictEqual(conn.connectionName, connectionProfile.connectionName);
		assert.strictEqual(conn.serverName, connectionProfile.serverName);
		assert.strictEqual(conn.databaseName, connectionProfile.databaseName);
		assert.strictEqual(conn.authenticationType, connectionProfile.authenticationType);
		assert.strictEqual(conn.password, connectionProfile.password);
		assert.strictEqual(conn.userName, connectionProfile.userName);
		assert.strictEqual(conn.groupId, connectionProfile.groupId);
		assert.strictEqual(conn.groupFullName, connectionProfile.groupFullName);
		assert.strictEqual(conn.savePassword, connectionProfile.savePassword);
	});

	test('getOptionsKey should create a valid unique id', () => {
		let conn = new ConnectionProfile(capabilitiesService, connectionProfile);
		let expectedId = 'providerName:MSSQL|authenticationType:|databaseName:database|serverName:new server|userName:user|databaseDisplayName:database|group:group id';
		let id = conn.getOptionsKey();
		assert.strictEqual(id, expectedId);
	});

	test('createFromStoredProfile should create connection profile from stored profile', () => {
		let savedProfile = storedProfile;
		let connectionProfile = ConnectionProfile.createFromStoredProfile(savedProfile, capabilitiesService);
		assert.strictEqual(savedProfile.groupId, connectionProfile.groupId);
		assert.deepStrictEqual(savedProfile.providerName, connectionProfile.providerName);
		assert.deepStrictEqual(savedProfile.savePassword, connectionProfile.savePassword);
		assert.deepStrictEqual(savedProfile.id, connectionProfile.id);
	});

	test('createFromStoredProfile should set the id to new guid if not set in stored profile', () => {
		let savedProfile: IConnectionProfileStore = Object.assign({}, storedProfile, { id: undefined });
		let connectionProfile = ConnectionProfile.createFromStoredProfile(savedProfile, capabilitiesService);
		assert.strictEqual(savedProfile.groupId, connectionProfile.groupId);
		assert.deepStrictEqual(savedProfile.providerName, connectionProfile.providerName);
		assert.strictEqual(savedProfile.savePassword, connectionProfile.savePassword);
		assert.notStrictEqual(connectionProfile.id, undefined);
		assert.strictEqual(savedProfile.id, undefined);
	});

	test('withoutPassword should create a new instance without password', () => {
		let conn = new ConnectionProfile(capabilitiesService, connectionProfile);
		assert.notStrictEqual(conn.password, '');
		let withoutPassword = conn.withoutPassword();
		assert.strictEqual(withoutPassword.password, '');
	});

	test('unique id should not include password', () => {
		let conn = new ConnectionProfile(capabilitiesService, connectionProfile);
		let withoutPassword = conn.withoutPassword();
		assert.strictEqual(withoutPassword.getOptionsKey(), conn.getOptionsKey());
	});

	test('cloneWithDatabase should create new profile with new id', () => {
		let conn = new ConnectionProfile(capabilitiesService, connectionProfile);
		let newProfile = conn.cloneWithDatabase('new db');
		assert.notStrictEqual(newProfile.id, conn.id);
		assert.strictEqual(newProfile.databaseName, 'new db');
	});

	test('an empty connection profile does not cause issues', () => {
		assert.doesNotThrow(() => new ConnectionProfile(capabilitiesService, {} as IConnectionProfile));
	});
});
