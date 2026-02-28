import { WriteStream } from 'node:tty';

const BAR_WIDTH = 30;

export class Progress {
	readonly total: number;
	#completed = 0;
	#label: string;
	#stream: { write(s: string): void; isTTY?: boolean; columns?: number };

	constructor(total: number, label: string, stream?: { write(s: string): void; isTTY?: boolean; columns?: number }) {
		this.total = total;
		this.#label = label;
		this.#stream = stream ?? process.stderr;
		this.#render();
	}

	get completed(): number {
		return this.#completed;
	}

	increment(n = 1): void {
		this.#completed = Math.min(this.#completed + n, this.total);
		this.#render();
	}

	#render(): void {
		const ratio = this.total > 0 ? this.#completed / this.total : 0;
		const percent = Math.floor(ratio * 100);
		const filled = Math.round(ratio * BAR_WIDTH);
		const empty = BAR_WIDTH - filled;
		const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
		const line = `\r${this.#label} ${bar} ${percent}% (${this.#completed}/${this.total})`;

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
