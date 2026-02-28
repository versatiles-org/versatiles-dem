import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sourceDataDir, sourceTilesDir, sourceVrtPath } from '../config.js';
import { run } from '../lib/command.js';
import type { SourceConfig } from '../lib/source.js';

export async function stepVrt(source: SourceConfig): Promise<void> {
	const tilesDir = sourceTilesDir(source.slug);
	const dataDir = sourceDataDir(source.slug);
	const vrtPath = sourceVrtPath(source.slug);

	const files = await readdir(tilesDir);
	const tifFiles = files.filter(f => f.endsWith('.tif')).sort();

	if (tifFiles.length === 0) {
		throw new Error(`No .tif files found in ${tilesDir}`);
	}

	console.log(`Building VRT from ${tifFiles.length} tiles...`);

	const fileListPath = join(dataDir, 'filelist.txt');
	const fileListContent = tifFiles.map(f => join(tilesDir, f)).join('\n');
	await writeFile(fileListPath, fileListContent);

	await run('gdalbuildvrt', ['-input_file_list', fileListPath, vrtPath]);

	console.log(`VRT created at ${vrtPath}`);
}
