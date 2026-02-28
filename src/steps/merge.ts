import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR, mergedVersatilesPath, sourceVersatilesPath } from '../config.js';
import { run } from '../lib/command.js';
import type { SourceConfig } from '../lib/source.js';
import { mkdir } from 'node:fs/promises';

export async function stepMerge(sources: SourceConfig[]): Promise<void> {
	await mkdir(DATA_DIR, { recursive: true });

	const inputPaths = sources.map((s) => sourceVersatilesPath(s.slug));
	const outputPath = mergedVersatilesPath();

	if (inputPaths.length === 0) {
		throw new Error('No sources to merge');
	}

	if (inputPaths.length === 1) {
		console.log('Only one source, skipping merge - use the source file directly.');
		return;
	}

	const pipelinePath = join(DATA_DIR, 'merge.vpl');
	const fromEntries = inputPaths.map((p) => `from_versatiles filename="${p}"`).join(' ');
	const pipelineContent = `from_stacked_raster [ ${fromEntries} ] | meta_update schema="dem/terrarium"`;

	await writeFile(pipelinePath, pipelineContent);

	console.log(`Merging ${inputPaths.length} sources into ${outputPath}`);
	await run('versatiles', ['convert', pipelinePath, outputPath]);

	console.log(`Merge complete: ${outputPath}`);
}
