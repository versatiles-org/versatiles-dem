import { mkdir } from 'node:fs/promises';
import { sourceDataDir } from '../config.js';
import type { SourceConfig } from '../lib/source.js';
import { downloadCopernicusTiles } from '../lib/copernicus.js';

export async function stepDownload(source: SourceConfig): Promise<void> {
	await mkdir(sourceDataDir(source.slug), { recursive: true });

	switch (source.type) {
		case 'copernicus-s3':
			await downloadCopernicusTiles(source.slug, source.config);
			break;
		default:
			throw new Error(`Unknown source type: ${source.type}`);
	}
}
