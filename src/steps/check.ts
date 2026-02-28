import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sourceTilesDir } from '../config.js';
import { loadCachedTileList } from '../lib/copernicus.js';
import { run } from '../lib/command.js';
import { Progress } from '../lib/progress.js';
import type { SourceConfig } from '../lib/source.js';

const MAX_CONCURRENT = 4;

export async function stepCheck(source: SourceConfig): Promise<void> {
	const tilesDir = sourceTilesDir(source.slug);

	// Completeness check
	const tileNames = await loadCachedTileList(source.slug);
	if (!tileNames) {
		throw new Error(`No tileList.txt found for ${source.slug}. Run the download step first.`);
	}

	const files = await readdir(tilesDir);
	const fileSet = new Set(files);

	const missing: string[] = [];
	for (const name of tileNames) {
		if (!fileSet.has(`${name}.tif`)) {
			missing.push(name);
		}
	}

	if (missing.length > 0) {
		console.warn(`Missing ${missing.length} tiles:`);
		for (const name of missing.slice(0, 20)) {
			console.warn(`  ${name}`);
		}
		if (missing.length > 20) {
			console.warn(`  ... and ${missing.length - 20} more`);
		}
	} else {
		console.log(`All ${tileNames.length} tiles present.`);
	}

	// Integrity check
	const tifFiles = files.filter(f => f.endsWith('.tif'));
	const corrupt: string[] = [];
	const progress = new Progress(tifFiles.length, 'Checking');

	const queue = [...tifFiles];

	async function worker(): Promise<void> {
		while (queue.length > 0) {
			const file = queue.shift()!;
			const filePath = join(tilesDir, file);
			try {
				const output = await run('gdalinfo', ['-json', filePath]);
				const info = JSON.parse(output);
				if (!info.bands || info.bands.length === 0) {
					corrupt.push(file);
				}
			} catch {
				corrupt.push(file);
			}
			progress.increment();
		}
	}

	const workers = Array.from({ length: MAX_CONCURRENT }, () => worker());
	await Promise.all(workers);

	if (corrupt.length > 0) {
		progress.finish(`${corrupt.length} corrupt tiles found`);
		for (const file of corrupt.slice(0, 20)) {
			console.error(`  ${file}`);
		}
		if (corrupt.length > 20) {
			console.error(`  ... and ${corrupt.length - 20} more`);
		}
	} else {
		progress.finish(`All ${tifFiles.length} tiles passed integrity check.`);
	}

	if (missing.length > 0 || corrupt.length > 0) {
		throw new Error(`Check failed: ${missing.length} missing, ${corrupt.length} corrupt`);
	}
}
