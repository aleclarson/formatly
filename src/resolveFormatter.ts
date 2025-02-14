import * as fs from "node:fs/promises";

import { Formatter, formatters } from "./formatters.js";
import path from "node:path";

export async function resolveFormatter(cwd = "."): Promise<Formatter | null> {
	const formatter = await escalade(cwd, async (dir, files) => {
		let foundGitDirectory = false;
		let getPackageData:
			| (() => Promise<Record<string, unknown> | undefined>)
			| undefined;

		for (const file of files) {
			if (file === ".git") {
				foundGitDirectory = true;
			} else if (file === "package.json") {
				getPackageData ??= () =>
					fs
						.readFile(path.join(dir, file), "utf8")
						.then(JSON.parse)
						.catch(() => undefined);
			} else {
				for (const formatter of formatters) {
					if (formatter.testers.configFile.test(file)) {
						return formatter;
					}
				}
			}
		}

		const packageData = await getPackageData?.();
		if (packageData) {
			const { scripts = {}, ...otherKeys } = packageData as {
				scripts?: Record<string, string>;
				[key: string]: unknown;
			};

			for (const script of Object.values(scripts)) {
				for (const formatter of formatters) {
					if (formatter.testers.script.test(script)) {
						return formatter;
					}
				}
			}

			for (const formatter of formatters) {
				if (
					"packageKey" in formatter.testers &&
					formatter.testers.packageKey in otherKeys
				) {
					return formatter;
				}
			}
		}

		if (foundGitDirectory) {
			return null;
		}
	});
	return formatter ?? null;
}

type Promisable<T> = T | Promise<T>;

async function escalade<T extends {} | null>(
	cwd: string,
	callback: (dir: string, files: string[]) => Promisable<T | undefined | void>,
): Promise<T | undefined> {
	const { root } = path.parse(cwd);
	for (let dir = cwd; dir !== root; dir = path.dirname(dir)) {
		const files = await fs.readdir(dir);
		const result = await callback(dir, files);
		if (result !== undefined) {
			return result;
		}
	}
}
