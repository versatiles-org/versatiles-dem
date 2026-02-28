import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../lib/command.js', () => ({
	runWithOutput: vi.fn(async () => undefined),
}));

import { runWithOutput } from '../lib/command.js';
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

describe('stepConvert', () => {
	let tempDir: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		tempDir = await mkdtemp(join(tmpdir(), 'convert-test-'));
		await mkdir(join(tempDir, 'test-source'), { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it('writes pipeline file and runs versatiles convert', async () => {
		vi.doMock('../config.js', () => ({
			sourceDataDir: (slug: string) => join(tempDir, slug),
			sourceVrtPath: (slug: string) => join(tempDir, slug, 'dem.vrt'),
			sourceVersatilesPath: (slug: string) => join(tempDir, slug, `${slug}.versatiles`),
		}));

		const { stepConvert } = await import('./convert.js');
		await stepConvert(makeSource());

		const pipelineContent = await readFile(join(tempDir, 'test-source', 'pipeline.vpl'), 'utf-8');
		expect(pipelineContent).toContain('from_gdal_dem');
		expect(pipelineContent).toContain('encoding="terrarium"');
		expect(pipelineContent).toContain('dem_quantize');
		expect(pipelineContent).toContain('meta_update schema="dem/terrarium"');

		expect(runWithOutput).toHaveBeenCalledWith('versatiles', [
			'convert',
			join(tempDir, 'test-source', 'pipeline.vpl'),
			join(tempDir, 'test-source', 'test-source.versatiles'),
		]);
	});
});
