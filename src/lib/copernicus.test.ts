import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CopernicusS3Config } from './source.js';

const mockSourceTilesDir = vi.fn();
const mockSourceTileListPath = vi.fn();

vi.mock('../config.js', () => ({
	sourceTilesDir: (...args: unknown[]) => mockSourceTilesDir(...args),
	sourceTileListPath: (...args: unknown[]) => mockSourceTileListPath(...args),
}));

import { parseTileList, loadCachedTileList, fetchTileList, downloadCopernicusTiles, retryConfig } from './copernicus.js';

describe('parseTileList', () => {
	it('parses newline-separated tile names', () => {
		const result = parseTileList('tile1/\ntile2/\ntile3/');
		expect(result).toEqual(['tile1', 'tile2', 'tile3']);
	});

	it('strips trailing slashes', () => {
		const result = parseTileList('Copernicus_DSM_COG_10_N00_00_E006_00_DEM/');
		expect(result).toEqual(['Copernicus_DSM_COG_10_N00_00_E006_00_DEM']);
	});

	it('handles empty lines and whitespace', () => {
		const result = parseTileList('  tile1  \n\n  tile2  \n\n');
		expect(result).toEqual(['tile1', 'tile2']);
	});

	it('returns empty array for empty input', () => {
		expect(parseTileList('')).toEqual([]);
		expect(parseTileList('  \n  \n  ')).toEqual([]);
	});
});

describe('loadCachedTileList', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'cache-test-'));
		mockSourceTileListPath.mockImplementation((slug: string) => join(tempDir, slug, 'tileList.txt'));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it('returns null when tileList.txt does not exist', async () => {
		const result = await loadCachedTileList('nonexistent');
		expect(result).toBeNull();
	});

	it('returns parsed tile list when file exists', async () => {
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });
		await writeFile(join(tempDir, 'test-slug', 'tileList.txt'), 'tile_a/\ntile_b/\n');

		const result = await loadCachedTileList('test-slug');
		expect(result).toEqual(['tile_a', 'tile_b']);
	});
});

describe('fetchTileList', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'fetch-test-'));
		mockSourceTileListPath.mockImplementation((slug: string) => join(tempDir, slug, 'tileList.txt'));
		mockSourceTilesDir.mockImplementation((slug: string) => join(tempDir, slug, 'tiles'));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
		vi.restoreAllMocks();
	});

	it('fetches tile list, writes it, and returns parsed names', async () => {
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => 'tile_a/\ntile_b/\n',
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		const result = await fetchTileList('test-slug', config);
		expect(result).toEqual(['tile_a', 'tile_b']);
		expect(mockFetch).toHaveBeenCalledWith('https://example.com/tileList.txt');

		const written = await readFile(join(tempDir, 'test-slug', 'tileList.txt'), 'utf-8');
		expect(written).toBe('tile_a/\ntile_b/\n');

		vi.unstubAllGlobals();
	});

	it('throws on non-ok response', async () => {
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			statusText: 'Not Found',
		}));

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await expect(fetchTileList('test-slug', config)).rejects.toThrow('Failed to fetch tile list: 404 Not Found');
		vi.unstubAllGlobals();
	});
});

describe('downloadCopernicusTiles', () => {
	let tempDir: string;

	beforeEach(async () => {
		retryConfig.delayMs = 0;
		tempDir = await mkdtemp(join(tmpdir(), 'download-test-'));
		mockSourceTilesDir.mockImplementation((slug: string) => join(tempDir, slug, 'tiles'));
		mockSourceTileListPath.mockImplementation((slug: string) => join(tempDir, slug, 'tileList.txt'));
	});

	afterEach(async () => {
		retryConfig.delayMs = 2000;
		await rm(tempDir, { recursive: true });
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('downloads tiles that do not yet exist', async () => {
		await mkdir(join(tempDir, 'test-slug', 'tiles'), { recursive: true });
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		const tileContent = Buffer.from('fake-tif-data');

		const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
			if (url.endsWith('tileList.txt')) {
				return { ok: true, text: async () => 'tile1/\n' };
			}
			if (opts?.method === 'HEAD') {
				return { ok: true, headers: { get: () => null } };
			}
			// GET for tile - return a web-compatible ReadableStream
			return {
				ok: true,
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(tileContent);
						controller.close();
					},
				}),
			};
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await downloadCopernicusTiles('test-slug', config);

		const downloaded = await readFile(join(tempDir, 'test-slug', 'tiles', 'tile1.tif'));
		expect(downloaded.toString()).toBe('fake-tif-data');
	});

	it('throws when download response has no body', async () => {
		await mkdir(join(tempDir, 'test-slug', 'tiles'), { recursive: true });
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
			if (url.endsWith('tileList.txt')) {
				return { ok: true, text: async () => 'tile1/\n' };
			}
			if (opts?.method === 'HEAD') {
				return { ok: true, headers: { get: () => null } };
			}
			return { ok: true, body: null };
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await expect(downloadCopernicusTiles('test-slug', config)).rejects.toThrow('No response body');
	});

	it('throws when download response is not ok', async () => {
		await mkdir(join(tempDir, 'test-slug', 'tiles'), { recursive: true });
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
			if (url.endsWith('tileList.txt')) {
				return { ok: true, text: async () => 'tile1/\n' };
			}
			if (opts?.method === 'HEAD') {
				return { ok: true, headers: { get: () => null } };
			}
			return { ok: false, status: 500, statusText: 'Server Error' };
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await expect(downloadCopernicusTiles('test-slug', config)).rejects.toThrow('Download failed: 500 Server Error');
	});

	it('retries on transient failure then succeeds', async () => {
		await mkdir(join(tempDir, 'test-slug', 'tiles'), { recursive: true });
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		const tileContent = Buffer.from('retry-data');
		let downloadAttempts = 0;

		const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
			if (url.endsWith('tileList.txt')) {
				return { ok: true, text: async () => 'tile1/\n' };
			}
			if (opts?.method === 'HEAD') {
				return { ok: true, headers: { get: () => null } };
			}
			downloadAttempts++;
			if (downloadAttempts <= 1) {
				throw new Error('Network error');
			}
			return {
				ok: true,
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(tileContent);
						controller.close();
					},
				}),
			};
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await downloadCopernicusTiles('test-slug', config);

		const downloaded = await readFile(join(tempDir, 'test-slug', 'tiles', 'tile1.tif'));
		expect(downloaded.toString()).toBe('retry-data');
		expect(downloadAttempts).toBeGreaterThanOrEqual(2);
	});

	it('downloads when file exists but size differs', async () => {
		const tilesDir = join(tempDir, 'test-slug', 'tiles');
		await mkdir(tilesDir, { recursive: true });
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		await writeFile(join(tilesDir, 'tile1.tif'), 'old');

		const newContent = Buffer.from('new-content');
		const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
			if (url.endsWith('tileList.txt')) {
				return { ok: true, text: async () => 'tile1/\n' };
			}
			if (opts?.method === 'HEAD') {
				return {
					ok: true,
					headers: { get: (key: string) => key === 'content-length' ? String(newContent.length) : null },
				};
			}
			return {
				ok: true,
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(newContent);
						controller.close();
					},
				}),
			};
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await downloadCopernicusTiles('test-slug', config);

		const content = await readFile(join(tilesDir, 'tile1.tif'));
		expect(content.toString()).toBe('new-content');
	});

	it('downloads when HEAD request fails', async () => {
		const tilesDir = join(tempDir, 'test-slug', 'tiles');
		await mkdir(tilesDir, { recursive: true });
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		await writeFile(join(tilesDir, 'tile1.tif'), 'old-data');

		const newContent = Buffer.from('refreshed');
		const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
			if (url.endsWith('tileList.txt')) {
				return { ok: true, text: async () => 'tile1/\n' };
			}
			if (opts?.method === 'HEAD') {
				throw new Error('HEAD failed');
			}
			return {
				ok: true,
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(newContent);
						controller.close();
					},
				}),
			};
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await downloadCopernicusTiles('test-slug', config);

		const content = await readFile(join(tilesDir, 'tile1.tif'));
		expect(content.toString()).toBe('refreshed');
	});

	it('skips tiles that already exist with matching size', async () => {
		const tilesDir = join(tempDir, 'test-slug', 'tiles');
		await mkdir(tilesDir, { recursive: true });
		await mkdir(join(tempDir, 'test-slug'), { recursive: true });

		const tileContent = Buffer.from('existing-data');
		await writeFile(join(tilesDir, 'tile1.tif'), tileContent);

		const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
			if (url.endsWith('tileList.txt')) {
				return { ok: true, text: async () => 'tile1/\n' };
			}
			if (opts?.method === 'HEAD') {
				return {
					ok: true,
					headers: { get: (key: string) => key === 'content-length' ? String(tileContent.length) : null },
				};
			}
			throw new Error('Should not download existing tile');
		});
		vi.stubGlobal('fetch', mockFetch);

		const config: CopernicusS3Config = {
			bucket: 'test-bucket',
			region: 'eu-central-1',
			tileListUrl: 'https://example.com/tileList.txt',
			tileUrlPattern: 'https://example.com/{name}/{name}.tif',
		};

		await downloadCopernicusTiles('test-slug', config);

		const content = await readFile(join(tilesDir, 'tile1.tif'));
		expect(content.toString()).toBe('existing-data');
	});
});
