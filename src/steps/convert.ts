import { sourceVrtPath, sourceVersatilesPath } from '../config.js';
import { runWithOutput } from '../lib/command.js';
import type { SourceConfig } from '../lib/source.js';

export async function stepConvert(source: SourceConfig): Promise<void> {
	const vrtPath = sourceVrtPath(source.slug);
	const outputPath = sourceVersatilesPath(source.slug);
	const pipelineContent = `from_gdal_dem filename='${vrtPath}' encoding=terrarium level_max=12 | dem_overview | raster_format format=webp quality=100 speed=0`;

	console.log(`Converting to .versatiles: ${outputPath}`);
	await runWithOutput('versatiles', ['--cache-dir', '/home/tmp', 'convert', `[,vpl](${pipelineContent})`, outputPath]);

	console.log(`Conversion complete: ${outputPath}`);
}
