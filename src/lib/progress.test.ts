import { describe, it, expect } from 'vitest';
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

function makeClock(startMs = 0) {
	let time = startMs;
	return {
		now: () => time,
		advance: (ms: number) => { time += ms; },
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

describe('Progress ETA', () => {
	it('shows no ETA at 0% or 100%', () => {
		const { stream, chunks } = makeTTYStream();
		const clock = makeClock();
		const p = new Progress(10, 'X', stream, clock.now);
		expect(chunks.at(-1)).not.toContain('ETA');

		clock.advance(10000);
		p.increment(10);
		expect(chunks.at(-1)).not.toContain('ETA');
	});

	it('shows ETA in seconds', () => {
		const { stream, chunks } = makeTTYStream();
		const clock = makeClock();
		const p = new Progress(10, 'X', stream, clock.now);

		clock.advance(5000); // 5s elapsed
		p.increment(5);      // 50% done, rate=1/s, 5 remaining -> ETA 5s
		expect(chunks.at(-1)).toContain('ETA 5s');
	});

	it('shows ETA in minutes and seconds', () => {
		const { stream, chunks } = makeTTYStream();
		const clock = makeClock();
		const p = new Progress(100, 'X', stream, clock.now);

		clock.advance(10000); // 10s elapsed
		p.increment(1);       // 1% done, rate=0.1/s, 99 remaining -> 990s -> 16m30s
		expect(chunks.at(-1)).toContain('ETA 16m30s');
	});

	it('shows ETA in hours and minutes', () => {
		const { stream, chunks } = makeTTYStream();
		const clock = makeClock();
		const p = new Progress(1000, 'X', stream, clock.now);

		clock.advance(60000); // 60s elapsed
		p.increment(10);      // 1% done, rate=10/60s, 990 remaining -> 5940s -> 1h39m
		expect(chunks.at(-1)).toContain('ETA 1h39m');
	});

	it('updates ETA as progress advances', () => {
		const { stream, chunks } = makeTTYStream();
		const clock = makeClock();
		const p = new Progress(100, 'X', stream, clock.now);

		clock.advance(10000);
		p.increment(50); // rate=5/s, 50 remaining -> 10s
		expect(chunks.at(-1)).toContain('ETA 10s');

		clock.advance(5000);
		p.increment(25); // 75 done in 15s, rate=5/s, 25 remaining -> 5s
		expect(chunks.at(-1)).toContain('ETA 5s');
	});
});
