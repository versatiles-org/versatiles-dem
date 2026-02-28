import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { SourceConfig } from '../lib/source.js';

const mockSourceDataDir = vi.fn();
const mockSourceTilesDir = vi.fn();
const mockSourceVrtPath = vi.fn();

vi.mock('../config.js', () => ({
	sourceDataDir: (...args: unknown[]) => mockSourceDataDir(...args),
	sourceTilesDir: (...args: unknown[]) => mockSourceTilesDir(...args),
	sourceVrtPath: (...args: unknown[]) => mockSourceVrtPath(...args),
}));

vi.mock('../lib/command.js', () => ({
	run: vi.fn(async () => ''),
}));

import { stepVrt } from './vrt.js';
import { run } from '../lib/command.js';

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

describe('stepVrt', () => {
	let tempDir: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		tempDir = await mkdtemp(join(tmpdir(), 'vrt-test-'));
		mockSourceDataDir.mockImplementation((slug: string) => join(tempDir, slug));
		mockSourceTilesDir.mockImplementation((slug: string) => join(tempDir, slug, 'tiles'));
		mockSourceVrtPath.mockImplementation((slug: string) => join(tempDir, slug, 'dem.vrt'));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it('builds VRT from tif files', async () => {
		const tilesDir = join(tempDir, 'test-source', 'tiles');
		await mkdir(tilesDir, { recursive: true });
		await writeFile(join(tilesDir, 'tile_a.tif'), '');
		await writeFile(join(tilesDir, 'tile_b.tif'), '');

		await stepVrt(makeSource());

		expect(run).toHaveBeenCalledWith('gdalbuildvrt', [
			'-input_file_list',
			join(tempDir, 'test-source', 'filelist.txt'),
			join(tempDir, 'test-source', 'dem.vrt'),
		]);

		const fileList = await readFile(join(tempDir, 'test-source', 'filelist.txt'), 'utf-8');
		const lines = fileList.split('\n');
		expect(lines).toHaveLength(2);
		expect(lines[0]).toContain('tile_a.tif');
		expect(lines[1]).toContain('tile_b.tif');
	});

	it('throws when no tif files found', async () => {
		const tilesDir = join(tempDir, 'test-source', 'tiles');
		await mkdir(tilesDir, { recursive: true });

		await expect(stepVrt(makeSource())).rejects.toThrow('No .tif files found');
	});
});
