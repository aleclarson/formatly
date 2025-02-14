import { spawn, StdioOptions } from "node:child_process";

import { Formatter } from "./formatters.js";
import { resolveFormatter } from "./resolveFormatter.js";
import { Readable } from "node:stream";

export interface FormatlyOptions {
	cwd?: string;
	stdio?: StdioOptions;
}

export type FormatlyReport<Stdio extends FormatlyOptions["stdio"] = "ignore"> =
	| FormatlyReportError
	| FormatlyReportResult<Stdio>;

export interface FormatlyReportError {
	message: string;
	ran: false;
}

interface SpawnResult {
	code: number | null;
	signal: NodeJS.Signals | null;
}

export interface FormatlyReportResult<
	Stdio extends FormatlyOptions["stdio"] = "ignore",
> {
	formatter: Formatter;
	ran: true;
	stdout: Stdio extends "pipe" ? Readable : null;
	stderr: Stdio extends "pipe" ? Readable : null;
	result: Stdio extends "pipe" ? Promise<SpawnResult> : SpawnResult;
}

export async function formatly<
	Options extends FormatlyOptions = Record<string, never>,
>(
	patterns: string[],
	options: Options = {} as Options,
): Promise<FormatlyReport<Options["stdio"]>> {
	if (!patterns.join("").trim()) {
		return {
			message: "No file patterns were provided to formatly.",
			ran: false,
		};
	}

	const formatter = await resolveFormatter(options.cwd);

	if (!formatter) {
		return { message: "Could not detect a reporter.", ran: false };
	}

	const [baseCommand, ...args] = formatter.runner.split(" ");

	let stdout: Readable | null = null;
	let stderr: Readable | null = null;

	const result = new Promise<SpawnResult>((resolve, reject) => {
		const child = spawn(baseCommand, [...args, ...patterns], {
			stdio: options.stdio ?? "ignore",
		});

		child.on("error", reject);
		child.on("exit", (code, signal) => {
			resolve({ code, signal });
		});

		stdout = child.stdout;
		stderr = child.stderr;
	});

	return {
		formatter,
		ran: true,
		stdout,
		stderr,
		result: options.stdio === "pipe" ? result : await result,
	} as FormatlyReport;
}
