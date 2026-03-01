import { sourceVrtPath, sourceVersatilesPath } from '../config.js';
import { runWithOutput } from '../lib/command.js';
import type { SourceConfig } from '../lib/source.js';

export async function stepConvert(source: SourceConfig): Promise<void> {
	const vrtPath = sourceVrtPath(source.slug);
	const outputPath = sourceVersatilesPath(source.slug);

	console.log(`Converting to .versatiles: ${outputPath}`);
	await runWithOutput('versatiles', [
		'convert',
		`[,vpl](from_gdal_dem filename='${vrtPath}' encoding='terrarium' level_max=12)`,
		outputPath,
	]);

	console.log(`Conversion complete: ${outputPath}`);
}
