import { parseArgs } from 'node:util';

const VALID_STEPS = ['download', 'check', 'vrt', 'convert', 'backup', 'merge'] as const;
export type StepName = typeof VALID_STEPS[number];

export interface CliArgs {
	source?: string;
	step?: StepName;
}

export function parseCliArgs(): CliArgs {
	const { values } = parseArgs({
		options: {
			source: { type: 'string' },
			step: { type: 'string' },
			help: { type: 'boolean', short: 'h' },
		},
		strict: true,
	});

	if (values.help) {
		console.log(`Usage: npx tsx src/main.ts [--source <slug>] [--step <name>]

Options:
  --source <slug>   Process only this source (default: all)
  --step <name>     Run only this step (default: all per-source steps)

Steps: ${VALID_STEPS.join(', ')}

The "merge" step runs once across all sources, not per-source.`);
		process.exit(0);
	}

	if (values.step && !VALID_STEPS.includes(values.step as StepName)) {
		throw new Error(`Invalid step "${values.step}". Valid steps: ${VALID_STEPS.join(', ')}`);
	}

	return {
		source: values.source,
		step: values.step as StepName | undefined,
	};
}
