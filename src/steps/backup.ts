import type { SourceConfig } from '../lib/source.js';

export async function stepBackup(source: SourceConfig): Promise<void> {
	console.log(`Backup for ${source.name}: not yet implemented`);
}
