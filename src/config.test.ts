import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	SOURCES_DIR,
	DATA_DIR,
	sourceDataDir,
	sourceTilesDir,
	sourceTileListPath,
	sourceVrtPath,
	sourceVersatilesPath,
	mergedVersatilesPath,
} from './config.js';

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '../..');

describe('config', () => {
	it('SOURCES_DIR points to sources/', () => {
		expect(SOURCES_DIR).toBe(resolve(PROJECT_ROOT, 'sources'));
	});

	it('DATA_DIR points to data/', () => {
		expect(DATA_DIR).toBe(resolve(PROJECT_ROOT, 'data'));
	});

	it('sourceDataDir returns data/<slug>', () => {
		expect(sourceDataDir('my-source')).toBe(resolve(PROJECT_ROOT, 'data/my-source'));
	});

	it('sourceTilesDir returns data/<slug>/tiles', () => {
		expect(sourceTilesDir('my-source')).toBe(resolve(PROJECT_ROOT, 'data/my-source/tiles'));
	});

	it('sourceTileListPath returns data/<slug>/tileList.txt', () => {
		expect(sourceTileListPath('my-source')).toBe(resolve(PROJECT_ROOT, 'data/my-source/tileList.txt'));
	});

	it('sourceVrtPath returns data/<slug>/dem.vrt', () => {
		expect(sourceVrtPath('my-source')).toBe(resolve(PROJECT_ROOT, 'data/my-source/dem.vrt'));
	});

	it('sourceVersatilesPath returns data/<slug>/<slug>.versatiles', () => {
		expect(sourceVersatilesPath('my-source')).toBe(resolve(PROJECT_ROOT, 'data/my-source/my-source.versatiles'));
	});

	it('mergedVersatilesPath returns data/dem.versatiles', () => {
		expect(mergedVersatilesPath()).toBe(resolve(PROJECT_ROOT, 'data/dem.versatiles'));
	});
});
