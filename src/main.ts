import { parseCliArgs, type StepName } from './args.js';
import { SOURCES_DIR } from './config.js';
import { verifyDependencies } from './lib/command.js';
import { loadSources, type SourceConfig } from './lib/source.js';
import { stepDownload } from './steps/download.js';
import { stepCheck } from './steps/check.js';
import { stepVrt } from './steps/vrt.js';
import { stepConvert } from './steps/convert.js';
import { stepBackup } from './steps/backup.js';
import { stepMerge } from './steps/merge.js';

const PER_SOURCE_STEPS: { name: StepName; run: (source: SourceConfig) => void | Promise<void> }[] = [
	{ name: 'download', run: stepDownload },
	{ name: 'check', run: stepCheck },
	{ name: 'vrt', run: stepVrt },
	{ name: 'convert', run: stepConvert },
	{ name: 'backup', run: stepBackup },
];

export async function main(): Promise<void> {
	const args = parseCliArgs();

	console.log('Verifying system dependencies...');
	await verifyDependencies(['gdalinfo', 'gdalbuildvrt', 'versatiles']);

	console.log('Loading sources...');
	let sources = await loadSources(SOURCES_DIR);

	if (args.source) {
		sources = sources.filter((s) => s.slug === args.source);
		if (sources.length === 0) {
			throw new Error(`Source "${args.source}" not found`);
		}
	}

	if (args.step === 'merge') {
		await stepMerge(sources);
		return;
	}

	for (const source of sources) {
		console.log(`\n=== Processing: ${source.name} ===`);

		const steps = args.step ? PER_SOURCE_STEPS.filter((s) => s.name === args.step) : PER_SOURCE_STEPS;

		for (const step of steps) {
			console.log(`\n--- Step: ${step.name} ---`);
			await step.run(source);
		}
	}

	if (!args.step) {
		console.log('\n--- Step: merge ---');
		await stepMerge(sources);
	}
}

const isEntry = process.argv[1]?.endsWith('main.ts');
if (isEntry) {
	main().catch((err: unknown) => {
		console.error(err);
		process.exit(1);
	});
}
