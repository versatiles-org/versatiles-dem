import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { SourceConfig } from '../lib/source.js';

const mockDataDir = vi.fn();
const mockMergedVersatilesPath = vi.fn();
const mockSourceVersatilesPath = vi.fn();

vi.mock('../config.js', () => ({
	get DATA_DIR() { return mockDataDir(); },
	mergedVersatilesPath: (...args: unknown[]) => mockMergedVersatilesPath(...args),
	sourceVersatilesPath: (...args: unknown[]) => mockSourceVersatilesPath(...args),
}));

vi.mock('../lib/command.js', () => ({
	run: vi.fn(async () => ''),
}));

import { stepMerge } from './merge.js';
import { run } from '../lib/command.js';

const makeSource = (slug: string): SourceConfig => ({
	name: `Source ${slug}`,
	slug,
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

describe('stepMerge', () => {
	let tempDir: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		tempDir = await mkdtemp(join(tmpdir(), 'merge-test-'));
		mockDataDir.mockReturnValue(tempDir);
		mockMergedVersatilesPath.mockReturnValue(join(tempDir, 'dem.versatiles'));
		mockSourceVersatilesPath.mockImplementation((slug: string) => join(tempDir, slug, `${slug}.versatiles`));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it('throws on empty sources', async () => {
		await expect(stepMerge([])).rejects.toThrow('No sources to merge');
	});

	it('skips merge for single source', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		await stepMerge([makeSource('source-a')]);

		expect(run).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('skipping merge'));
		logSpy.mockRestore();
	});

	it('writes merge pipeline and runs versatiles convert for multiple sources', async () => {
		await stepMerge([makeSource('glo30'), makeSource('glo90')]);

		const pipelineContent = await readFile(join(tempDir, 'merge.vpl'), 'utf-8');
		expect(pipelineContent).toContain('from_stacked_raster');
		expect(pipelineContent).toContain('from_versatiles');
		expect(pipelineContent).toContain('glo30.versatiles');
		expect(pipelineContent).toContain('glo90.versatiles');
		expect(pipelineContent).toContain('meta_update schema="dem/terrarium"');

		expect(run).toHaveBeenCalledWith('versatiles', [
			'convert',
			join(tempDir, 'merge.vpl'),
			join(tempDir, 'dem.versatiles'),
		]);
	});
});
