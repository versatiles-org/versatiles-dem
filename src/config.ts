import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '../..');
export const SOURCES_DIR = join(PROJECT_ROOT, 'sources');
export const DATA_DIR = join(PROJECT_ROOT, 'data');

export function sourceDataDir(slug: string): string {
	return join(DATA_DIR, slug);
}

export function sourceTilesDir(slug: string): string {
	return join(DATA_DIR, slug, 'tiles');
}

export function sourceTileListPath(slug: string): string {
	return join(DATA_DIR, slug, 'tileList.txt');
}

export function sourceVrtPath(slug: string): string {
	return join(DATA_DIR, slug, 'dem.vrt');
}

export function sourceVersatilesPath(slug: string): string {
	return join(DATA_DIR, slug, `${slug}.versatiles`);
}

export function mergedVersatilesPath(): string {
	return join(DATA_DIR, 'dem.versatiles');
}
