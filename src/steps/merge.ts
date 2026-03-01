import { mergedVersatilesPath, sourceVersatilesPath } from '../config.js';
import { runWithOutput } from '../lib/command.js';
import type { SourceConfig } from '../lib/source.js';

export async function stepMerge(sources: SourceConfig[]): Promise<void> {
	const inputPaths = sources.map((s) => sourceVersatilesPath(s.slug));
	const outputPath = mergedVersatilesPath();

	if (inputPaths.length === 0) {
		throw new Error('No sources to merge');
	}

	if (inputPaths.length === 1) {
		console.log('Only one source, skipping merge - use the source file directly.');
		return;
	}

	const fromEntries = inputPaths.map((p) => `from_versatiles filename='${p}'`).join(' ');
	const pipelineContent = `from_stacked_raster [ ${fromEntries} ] | meta_update schema='dem/terrarium'`;

	console.log(`Merging ${inputPaths.length} sources into ${outputPath}`);
	await runWithOutput('versatiles', ['convert', `[,vpl](${pipelineContent})`, outputPath]);

	console.log(`Merge complete: ${outputPath}`);
}
