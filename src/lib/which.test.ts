import { describe, it, expect } from 'vitest';
import { which } from './which.js';

describe('which', () => {
	it('returns true for a command that exists', async () => {
		expect(await which('node')).toBe(true);
	});

	it('returns false for a command that does not exist', async () => {
		expect(await which('nonexistent-command-xyz-123')).toBe(false);
	});
});
