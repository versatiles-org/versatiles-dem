import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	return { ...actual, mkdir: vi.fn(async () => undefined) };
});

vi.mock('../lib/copernicus.js', () => ({
	downloadCopernicusTiles: vi.fn(async () => undefined),
}));

vi.mock('../config.js', () => ({
	sourceDataDir: (slug: string) => `/data/${slug}`,
}));

import { stepDownload } from './download.js';
import { downloadCopernicusTiles } from '../lib/copernicus.js';
import { mkdir } from 'node:fs/promises';
import type { SourceConfig } from '../lib/source.js';

const makeSource = (overrides?: Partial<SourceConfig>): SourceConfig => ({
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
	...overrides,
});

describe('stepDownload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates data directory and dispatches to copernicus adapter', async () => {
		await stepDownload(makeSource());
		expect(mkdir).toHaveBeenCalledWith('/data/test-source', { recursive: true });
		expect(downloadCopernicusTiles).toHaveBeenCalledWith('test-source', makeSource().config);
	});

	it('throws on unknown source type', async () => {
		await expect(stepDownload(makeSource({ type: 'unknown' }))).rejects.toThrow('Unknown source type: unknown');
	});
});
