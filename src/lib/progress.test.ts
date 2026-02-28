import { describe, it, expect, vi } from 'vitest';
import { Progress } from './progress.js';

function makeTTYStream() {
	const chunks: string[] = [];
	return {
		stream: { write: (s: string) => { chunks.push(s); }, isTTY: true as const },
		chunks,
	};
}

function makeNonTTYStream() {
	const chunks: string[] = [];
	return {
		stream: { write: (s: string) => { chunks.push(s); }, isTTY: false as const },
		chunks,
	};
}

describe('Progress', () => {
	it('renders initial state at 0%', () => {
		const { stream, chunks } = makeTTYStream();
		new Progress(100, 'Test', stream);
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toContain('Test');
		expect(chunks[0]).toContain('0%');
		expect(chunks[0]).toContain('0/100');
	});

	it('increments and updates the bar', () => {
		const { stream, chunks } = makeTTYStream();
		const p = new Progress(4, 'DL', stream);
		p.increment();
		expect(chunks.at(-1)).toContain('25%');
		expect(chunks.at(-1)).toContain('1/4');
		p.increment();
		expect(chunks.at(-1)).toContain('50%');
		expect(chunks.at(-1)).toContain('2/4');
	});

	it('tracks completed count', () => {
		const { stream } = makeTTYStream();
		const p = new Progress(10, 'X', stream);
		expect(p.completed).toBe(0);
		p.increment(3);
		expect(p.completed).toBe(3);
		p.increment();
		expect(p.completed).toBe(4);
	});

	it('clamps completed at total', () => {
		const { stream } = makeTTYStream();
		const p = new Progress(2, 'X', stream);
		p.increment(5);
		expect(p.completed).toBe(2);
		expect(p.total).toBe(2);
	});

	it('finish clears the line and prints message', () => {
		const { stream, chunks } = makeTTYStream();
		const p = new Progress(1, 'X', stream);
		p.finish('Done!');
		// Last two writes: clear line + message
		expect(chunks.at(-1)).toBe('Done!\n');
		expect(chunks.at(-2)).toMatch(/^\r\s+\r$/);
	});

	it('finish without message just clears the line', () => {
		const { stream, chunks } = makeTTYStream();
		const p = new Progress(1, 'X', stream);
		const countBefore = chunks.length;
		p.finish();
		expect(chunks.length).toBe(countBefore + 1);
		expect(chunks.at(-1)).toMatch(/^\r\s+\r$/);
	});

	it('does not write to non-TTY streams', () => {
		const { stream, chunks } = makeNonTTYStream();
		const p = new Progress(10, 'X', stream);
		p.increment(5);
		expect(chunks).toHaveLength(0);
	});

	it('finish writes message to non-TTY streams', () => {
		const { stream, chunks } = makeNonTTYStream();
		const p = new Progress(10, 'X', stream);
		p.finish('All done');
		expect(chunks).toEqual(['All done\n']);
	});

	it('handles total of 0', () => {
		const { stream, chunks } = makeTTYStream();
		const p = new Progress(0, 'Empty', stream);
		expect(chunks[0]).toContain('0%');
		expect(chunks[0]).toContain('0/0');
		p.finish('ok');
	});

	it('renders 100% when fully complete', () => {
		const { stream, chunks } = makeTTYStream();
		const p = new Progress(3, 'X', stream);
		p.increment(3);
		expect(chunks.at(-1)).toContain('100%');
		expect(chunks.at(-1)).toContain('3/3');
	});
});
