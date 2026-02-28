import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCliArgs } from './args.js';

describe('parseCliArgs', () => {
	const originalArgv = process.argv;

	beforeEach(() => {
		process.argv = ['node', 'main.ts'];
	});

	afterEach(() => {
		process.argv = originalArgv;
	});

	it('returns empty args when no flags given', () => {
		const args = parseCliArgs();
		expect(args).toEqual({ source: undefined, step: undefined });
	});

	it('parses --source flag', () => {
		process.argv = ['node', 'main.ts', '--source', 'copernicus-dem-glo90'];
		const args = parseCliArgs();
		expect(args.source).toBe('copernicus-dem-glo90');
	});

	it('parses --step flag', () => {
		process.argv = ['node', 'main.ts', '--step', 'download'];
		const args = parseCliArgs();
		expect(args.step).toBe('download');
	});

	it('parses both flags together', () => {
		process.argv = ['node', 'main.ts', '--source', 'my-source', '--step', 'vrt'];
		const args = parseCliArgs();
		expect(args.source).toBe('my-source');
		expect(args.step).toBe('vrt');
	});

	it('throws on invalid step', () => {
		process.argv = ['node', 'main.ts', '--step', 'invalid'];
		expect(() => parseCliArgs()).toThrow('Invalid step "invalid"');
	});

	it('accepts all valid step names', () => {
		for (const step of ['download', 'check', 'vrt', 'convert', 'backup', 'merge']) {
			process.argv = ['node', 'main.ts', '--step', step];
			const args = parseCliArgs();
			expect(args.step).toBe(step);
		}
	});

	it('exits on --help', () => {
		process.argv = ['node', 'main.ts', '--help'];
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		expect(() => parseCliArgs()).toThrow('exit');
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
		exitSpy.mockRestore();
		logSpy.mockRestore();
	});

	it('throws on unknown flags', () => {
		process.argv = ['node', 'main.ts', '--unknown'];
		expect(() => parseCliArgs()).toThrow();
	});
});
