import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	return {
		...actual,
		readdir: vi.fn(),
	};
});

vi.mock('../config.js', () => ({
	sourceTilesDir: (slug: string) => `/data/${slug}/tiles`,
}));

vi.mock('../lib/copernicus.js', () => ({
	loadCachedTileList: vi.fn(),
}));

vi.mock('../lib/command.js', () => ({
	run: vi.fn(),
}));

vi.mock('../lib/progress.js', () => ({
	Progress: class {
		increment() {}
		finish() {}
	},
}));

import { stepCheck } from './check.js';
import { readdir } from 'node:fs/promises';
import { loadCachedTileList } from '../lib/copernicus.js';
import { run } from '../lib/command.js';
import type { SourceConfig } from '../lib/source.js';

const makeSource = (): SourceConfig => ({
	name: 'Test',
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

describe('stepCheck', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('throws when no tileList.txt exists', async () => {
		vi.mocked(loadCachedTileList).mockResolvedValue(null);
		await expect(stepCheck(makeSource())).rejects.toThrow('No tileList.txt found');
	});

	it('passes when all tiles are present and valid', async () => {
		vi.mocked(loadCachedTileList).mockResolvedValue(['tile1', 'tile2']);
		vi.mocked(readdir).mockResolvedValue(['tile1.tif', 'tile2.tif'] as any);
		vi.mocked(run).mockResolvedValue(JSON.stringify({ bands: [{ band: 1 }] }));

		await expect(stepCheck(makeSource())).resolves.toBeUndefined();
	});

	it('fails when tiles are missing', async () => {
		vi.mocked(loadCachedTileList).mockResolvedValue(['tile1', 'tile2', 'tile3']);
		vi.mocked(readdir).mockResolvedValue(['tile1.tif'] as any);
		vi.mocked(run).mockResolvedValue(JSON.stringify({ bands: [{ band: 1 }] }));

		await expect(stepCheck(makeSource())).rejects.toThrow('Check failed: 2 missing, 0 corrupt');
	});

	it('fails when tiles are corrupt (no bands)', async () => {
		vi.mocked(loadCachedTileList).mockResolvedValue(['tile1']);
		vi.mocked(readdir).mockResolvedValue(['tile1.tif'] as any);
		vi.mocked(run).mockResolvedValue(JSON.stringify({ bands: [] }));

		await expect(stepCheck(makeSource())).rejects.toThrow('Check failed: 0 missing, 1 corrupt');
	});

	it('fails when gdalinfo throws', async () => {
		vi.mocked(loadCachedTileList).mockResolvedValue(['tile1']);
		vi.mocked(readdir).mockResolvedValue(['tile1.tif'] as any);
		vi.mocked(run).mockRejectedValue(new Error('gdalinfo failed'));

		await expect(stepCheck(makeSource())).rejects.toThrow('Check failed: 0 missing, 1 corrupt');
	});

	it('reports both missing and corrupt', async () => {
		vi.mocked(loadCachedTileList).mockResolvedValue(['tile1', 'tile2']);
		vi.mocked(readdir).mockResolvedValue(['tile1.tif'] as any);
		vi.mocked(run).mockRejectedValue(new Error('gdalinfo failed'));

		await expect(stepCheck(makeSource())).rejects.toThrow('Check failed: 1 missing, 1 corrupt');
	});
});
