import { describe, it, expect, vi } from 'vitest';
import { stepBackup } from './backup.js';
import type { SourceConfig } from '../lib/source.js';

const makeSource = (): SourceConfig => ({
	name: 'Test Source',
	slug: 'test-source',
	license: 'MIT',
	url: 'https://example.com',
	date: '2024',
	type: 'copernicus-s3',
	config: {
		bucket: 'test',
		region: 'eu-central-1',
		tileListUrl: 'https://example.com/tileList.txt',
		tileUrlPattern: 'https://example.com/{name}/{name}.tif',
	},
});

describe('stepBackup', () => {
	it('logs not yet implemented', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		await stepBackup(makeSource());
		expect(logSpy).toHaveBeenCalledWith('Backup for Test Source: not yet implemented');
		logSpy.mockRestore();
	});
});
