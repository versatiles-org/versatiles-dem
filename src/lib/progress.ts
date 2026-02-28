import { WriteStream } from 'node:tty';

const BAR_WIDTH = 30;

export class Progress {
	readonly total: number;
	#completed = 0;
	#label: string;
	#stream: { write(s: string): void; isTTY?: boolean; columns?: number };
	#startTime: number;
	#now: () => number;

	constructor(total: number, label: string, stream?: { write(s: string): void; isTTY?: boolean; columns?: number }, now?: () => number) {
		this.total = total;
		this.#label = label;
		this.#stream = stream ?? process.stderr;
		this.#now = now ?? Date.now;
		this.#startTime = this.#now();
		this.#render();
	}

	get completed(): number {
		return this.#completed;
	}

	increment(n = 1): void {
		this.#completed = Math.min(this.#completed + n, this.total);
		this.#render();
	}

	#formatEta(): string {
		if (this.#completed === 0 || this.#completed >= this.total) return '';
		const elapsed = this.#now() - this.#startTime;
		const rate = this.#completed / elapsed;
		const remaining = (this.total - this.#completed) / rate;
		return ` ETA ${this.#formatDuration(remaining)}`;
	}

	#formatDuration(ms: number): string {
		const totalSeconds = Math.ceil(ms / 1000);
		if (totalSeconds < 60) return `${totalSeconds}s`;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		if (minutes < 60) return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}h${mins.toString().padStart(2, '0')}m`;
	}

	#render(): void {
		const ratio = this.total > 0 ? this.#completed / this.total : 0;
		const percent = Math.floor(ratio * 100);
		const filled = Math.round(ratio * BAR_WIDTH);
		const empty = BAR_WIDTH - filled;
		const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
		const eta = this.#formatEta();
		const line = `\r${this.#label} ${bar} ${percent}% (${this.#completed}/${this.total})${eta}`;

		if (this.#stream.isTTY || (this.#stream as WriteStream).isTTY) {
			this.#stream.write(line);
		}
	}

	finish(message?: string): void {
		if (this.#stream.isTTY || (this.#stream as WriteStream).isTTY) {
			this.#stream.write('\r' + ' '.repeat(80) + '\r');
		}
		if (message) {
			this.#stream.write(message + '\n');
		}
	}
}
