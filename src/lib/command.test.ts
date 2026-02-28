import { describe, it, expect, vi } from 'vitest';
import { run, verifyDependencies } from './command.js';

vi.mock('./which.js', () => ({
	which: vi.fn(async (cmd: string) => cmd !== 'missing-cmd'),
}));

describe('run', () => {
	it('executes a command and returns stdout', async () => {
		const result = await run('echo', ['hello world']);
		expect(result.trim()).toBe('hello world');
	});

	it('throws on a failing command', async () => {
		await expect(run('false', [])).rejects.toThrow();
	});

	it('respects cwd option', async () => {
		const result = await run('pwd', [], { cwd: '/tmp' });
		expect(result.trim()).toMatch(/^\/.*tmp/);
	});
});

describe('verifyDependencies', () => {
	it('succeeds when all commands are found', async () => {
		await expect(verifyDependencies(['node', 'echo'])).resolves.toBeUndefined();
	});

	it('throws listing missing commands', async () => {
		await expect(verifyDependencies(['node', 'missing-cmd'])).rejects.toThrow(
			'Missing system dependencies: missing-cmd',
		);
	});
});
