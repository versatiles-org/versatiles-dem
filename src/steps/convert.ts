import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sourceDataDir, sourceVrtPath, sourceVersatilesPath } from '../config.js';
import { runWithOutput } from '../lib/command.js';
import type { SourceConfig } from '../lib/source.js';

export async function stepConvert(source: SourceConfig): Promise<void> {
	const dataDir = sourceDataDir(source.slug);
	const vrtPath = sourceVrtPath(source.slug);
	const outputPath = sourceVersatilesPath(source.slug);

	const pipelinePath = join(dataDir, 'pipeline.vpl');
	const pipelineContent = `from_gdal_dem filename="${vrtPath}" encoding="terrarium" | dem_quantize | meta_update schema="dem/terrarium"`;

	await writeFile(pipelinePath, pipelineContent);

	console.log(`Converting to .versatiles: ${outputPath}`);
	await runWithOutput('versatiles', ['convert', pipelinePath, outputPath]);

	console.log(`Conversion complete: ${outputPath}`);
}
