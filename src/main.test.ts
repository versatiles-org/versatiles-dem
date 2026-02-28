import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockParseCliArgs = vi.fn();
const mockVerifyDependencies = vi.fn();
const mockLoadSources = vi.fn();
const mockStepDownload = vi.fn();
const mockStepCheck = vi.fn();
const mockStepVrt = vi.fn();
const mockStepConvert = vi.fn();
const mockStepBackup = vi.fn();
const mockStepMerge = vi.fn();

vi.mock('./args.js', () => ({
	parseCliArgs: (...args: unknown[]) => mockParseCliArgs(...args),
}));

vi.mock('./config.js', () => ({
	SOURCES_DIR: '/mock/sources',
}));

vi.mock('./lib/command.js', () => ({
	verifyDependencies: (...args: unknown[]) => mockVerifyDependencies(...args),
}));

vi.mock('./lib/source.js', () => ({
	loadSources: (...args: unknown[]) => mockLoadSources(...args),
}));

vi.mock('./steps/download.js', () => ({
	stepDownload: (...args: unknown[]) => mockStepDownload(...args),
}));

vi.mock('./steps/check.js', () => ({
	stepCheck: (...args: unknown[]) => mockStepCheck(...args),
}));

vi.mock('./steps/vrt.js', () => ({
	stepVrt: (...args: unknown[]) => mockStepVrt(...args),
}));

vi.mock('./steps/convert.js', () => ({
	stepConvert: (...args: unknown[]) => mockStepConvert(...args),
}));

vi.mock('./steps/backup.js', () => ({
	stepBackup: (...args: unknown[]) => mockStepBackup(...args),
}));

vi.mock('./steps/merge.js', () => ({
	stepMerge: (...args: unknown[]) => mockStepMerge(...args),
}));

import { main } from './main.js';

const sourceA = {
	name: 'Source A',
	slug: 'source-a',
	license: 'MIT',
	url: 'https://example.com',
	date: '2024',
	type: 'copernicus-s3',
	config: { bucket: 'a', region: 'eu-central-1', tileListUrl: '', tileUrlPattern: '' },
};

const sourceB = {
	name: 'Source B',
	slug: 'source-b',
	license: 'MIT',
	url: 'https://example.com',
	date: '2024',
	type: 'copernicus-s3',
	config: { bucket: 'b', region: 'eu-central-1', tileListUrl: '', tileUrlPattern: '' },
};

describe('main', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockVerifyDependencies.mockResolvedValue(undefined);
		mockLoadSources.mockResolvedValue([sourceA, sourceB]);
		mockStepDownload.mockResolvedValue(undefined);
		mockStepCheck.mockResolvedValue(undefined);
		mockStepVrt.mockResolvedValue(undefined);
		mockStepConvert.mockResolvedValue(undefined);
		mockStepBackup.mockResolvedValue(undefined);
		mockStepMerge.mockResolvedValue(undefined);
	});

	it('runs all steps for all sources when no flags given', async () => {
		mockParseCliArgs.mockReturnValue({});

		await main();

		expect(mockVerifyDependencies).toHaveBeenCalledWith(['gdalinfo', 'gdalbuildvrt', 'versatiles']);
		expect(mockLoadSources).toHaveBeenCalledWith('/mock/sources');
		expect(mockStepDownload).toHaveBeenCalledTimes(2);
		expect(mockStepCheck).toHaveBeenCalledTimes(2);
		expect(mockStepVrt).toHaveBeenCalledTimes(2);
		expect(mockStepConvert).toHaveBeenCalledTimes(2);
		expect(mockStepBackup).toHaveBeenCalledTimes(2);
		expect(mockStepMerge).toHaveBeenCalledWith([sourceA, sourceB]);
	});

	it('filters by --source flag', async () => {
		mockParseCliArgs.mockReturnValue({ source: 'source-b' });

		await main();

		expect(mockStepDownload).toHaveBeenCalledTimes(1);
		expect(mockStepDownload).toHaveBeenCalledWith(sourceB);
	});

	it('throws when --source does not match any source', async () => {
		mockParseCliArgs.mockReturnValue({ source: 'nonexistent' });

		await expect(main()).rejects.toThrow('Source "nonexistent" not found');
	});

	it('runs only specified step with --step flag', async () => {
		mockParseCliArgs.mockReturnValue({ step: 'download' });

		await main();

		expect(mockStepDownload).toHaveBeenCalledTimes(2);
		expect(mockStepCheck).not.toHaveBeenCalled();
		expect(mockStepVrt).not.toHaveBeenCalled();
		expect(mockStepMerge).not.toHaveBeenCalled();
	});

	it('runs merge step directly with --step merge', async () => {
		mockParseCliArgs.mockReturnValue({ step: 'merge' });

		await main();

		expect(mockStepMerge).toHaveBeenCalledWith([sourceA, sourceB]);
		expect(mockStepDownload).not.toHaveBeenCalled();
	});

	it('propagates errors', async () => {
		mockParseCliArgs.mockReturnValue({});
		mockVerifyDependencies.mockRejectedValue(new Error('missing deps'));

		await expect(main()).rejects.toThrow('missing deps');
	});
});
