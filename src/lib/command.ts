import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { which } from './which.js';

const execFileAsync = promisify(execFileCb);

export async function run(command: string, args: string[], options?: { cwd?: string }): Promise<string> {
	const { stdout } = await execFileAsync(command, args, {
		maxBuffer: 50 * 1024 * 1024,
		cwd: options?.cwd,
	});
	return stdout;
}

export async function verifyDependencies(commands: string[]): Promise<void> {
	const missing: string[] = [];
	for (const cmd of commands) {
		const found = await which(cmd);
		if (!found) missing.push(cmd);
	}
	if (missing.length > 0) {
		throw new Error(`Missing system dependencies: ${missing.join(', ')}`);
	}
}
