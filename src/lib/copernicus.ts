import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { CopernicusS3Config } from './source.js';
import { sourceTilesDir, sourceTileListPath } from '../config.js';
import { writeFile, readFile } from 'node:fs/promises';
import { Progress } from './progress.js';

const MAX_CONCURRENT = 8;
const MAX_RETRIES = 3;

export const retryConfig = { delayMs: 2000 };

export async function fetchTileList(slug: string, config: CopernicusS3Config): Promise<string[]> {
	const tileListPath = sourceTileListPath(slug);

	console.log(`Fetching tile list from ${config.tileListUrl}`);
	const response = await fetch(config.tileListUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch tile list: ${response.status} ${response.statusText}`);
	}

	const text = await response.text();
	await writeFile(tileListPath, text);

	return parseTileList(text);
}

export function parseTileList(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim().replace(/\/$/, ''))
		.filter((line) => line.length > 0);
}

export async function loadCachedTileList(slug: string): Promise<string[] | null> {
	try {
		const text = await readFile(sourceTileListPath(slug), 'utf-8');
		return parseTileList(text);
	} catch {
		return null;
	}
}

async function getRemoteSize(url: string): Promise<number | null> {
	try {
		const res = await fetch(url, { method: 'HEAD' });
		if (!res.ok) return null;
		const cl = res.headers.get('content-length');
		return cl ? parseInt(cl, 10) : null;
	} catch {
		return null;
	}
}

async function downloadFile(url: string, destPath: string): Promise<void> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Download failed: ${response.status} ${response.statusText} for ${url}`);
	}
	if (!response.body) {
		throw new Error(`No response body for ${url}`);
	}

	const fileStream = createWriteStream(destPath);
	// @ts-expect-error Node's Readable.fromWeb types don't match the web ReadableStream
	await pipeline(Readable.fromWeb(response.body), fileStream);
}

async function shouldDownload(filePath: string, url: string): Promise<boolean> {
	try {
		const fileStat = await stat(filePath);
		const remoteSize = await getRemoteSize(url);
		if (remoteSize !== null && fileStat.size === remoteSize) {
			return false;
		}
	} catch {
		// file doesn't exist
	}
	return true;
}

async function downloadWithRetry(url: string, destPath: string, retries: number = MAX_RETRIES): Promise<void> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await downloadFile(url, destPath);
			return;
		} catch (err: unknown) {
			if (attempt === retries) throw err;
			console.warn(`  Retry ${attempt}/${retries} for ${url}: ${String(err)}`);
			await new Promise((resolve) => setTimeout(resolve, retryConfig.delayMs * attempt));
		}
	}
}

export async function downloadCopernicusTiles(slug: string, config: CopernicusS3Config): Promise<void> {
	const tilesDir = sourceTilesDir(slug);
	await mkdir(tilesDir, { recursive: true });

	const tileNames = await fetchTileList(slug, config);
	const progress = new Progress(tileNames.length, 'Downloading');
	let skipped = 0;

	const queue = [...tileNames];

	async function worker(): Promise<void> {
		while (queue.length > 0) {
			const name = queue.shift();
			if (!name) break;
			const url = config.tileUrlPattern.replace(/\{name\}/g, name);
			const destPath = join(tilesDir, `${name}.tif`);

			const needsDownload = await shouldDownload(destPath, url);
			if (!needsDownload) {
				skipped++;
				progress.increment();
				continue;
			}

			await downloadWithRetry(url, destPath);
			progress.increment();
		}
	}

	const workers = Array.from({ length: MAX_CONCURRENT }, () => worker());
	await Promise.all(workers);

	progress.finish(`Downloaded ${progress.completed} tiles (${skipped} skipped)`);
}
