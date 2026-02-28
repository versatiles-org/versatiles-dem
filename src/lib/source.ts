import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface CopernicusS3Config {
	bucket: string;
	region: string;
	tileListUrl: string;
	tileUrlPattern: string;
}

export interface SourceConfig {
	name: string;
	slug: string;
	license: string;
	url: string;
	date: string;
	type: string;
	config: CopernicusS3Config;
}

export async function loadSources(sourcesDir: string): Promise<SourceConfig[]> {
	const files = await readdir(sourcesDir);
	const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

	const sources: SourceConfig[] = [];
	for (const file of yamlFiles) {
		const content = await readFile(join(sourcesDir, file), 'utf-8');
		sources.push(parseYaml(content) as SourceConfig);
	}
	return sources;
}
