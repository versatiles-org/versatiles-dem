import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFileCb);

export async function which(command: string): Promise<boolean> {
	try {
		await execFileAsync('which', [command]);
		return true;
	} catch {
		return false;
	}
}
