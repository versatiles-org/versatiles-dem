import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSources } from './source.js';

describe('loadSources', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'sources-test-'));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it('loads YAML files from directory', async () => {
		await writeFile(
			join(tempDir, 'test.yaml'),
			`
name: Test Source
slug: test-source
license: MIT
url: https://example.com
date: "2024"
type: copernicus-s3
config:
  bucket: test-bucket
  region: eu-central-1
  tileListUrl: https://example.com/tileList.txt
  tileUrlPattern: https://example.com/{name}/{name}.tif
`,
		);

		const sources = await loadSources(tempDir);
		expect(sources).toHaveLength(1);
		expect(sources[0].slug).toBe('test-source');
		expect(sources[0].type).toBe('copernicus-s3');
		expect(sources[0].config.bucket).toBe('test-bucket');
	});

	it('loads multiple files sorted by name', async () => {
		await writeFile(
			join(tempDir, 'b.yaml'),
			'name: B\nslug: b\nlicense: MIT\nurl: x\ndate: "2024"\ntype: t\nconfig: {}',
		);
		await writeFile(
			join(tempDir, 'a.yaml'),
			'name: A\nslug: a\nlicense: MIT\nurl: x\ndate: "2024"\ntype: t\nconfig: {}',
		);

		const sources = await loadSources(tempDir);
		expect(sources).toHaveLength(2);
		expect(sources[0].slug).toBe('a');
		expect(sources[1].slug).toBe('b');
	});

	it('ignores non-YAML files', async () => {
		await writeFile(join(tempDir, 'readme.txt'), 'not yaml');
		await writeFile(
			join(tempDir, 'source.yaml'),
			'name: X\nslug: x\nlicense: MIT\nurl: x\ndate: "2024"\ntype: t\nconfig: {}',
		);

		const sources = await loadSources(tempDir);
		expect(sources).toHaveLength(1);
	});

	it('returns empty array for empty directory', async () => {
		const sources = await loadSources(tempDir);
		expect(sources).toEqual([]);
	});

	it('supports .yml extension', async () => {
		await writeFile(
			join(tempDir, 'source.yml'),
			'name: Y\nslug: y\nlicense: MIT\nurl: x\ndate: "2024"\ntype: t\nconfig: {}',
		);

		const sources = await loadSources(tempDir);
		expect(sources).toHaveLength(1);
		expect(sources[0].slug).toBe('y');
	});
});
