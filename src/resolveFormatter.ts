import * as fs from "node:fs/promises";
import { readPackageUp } from "read-package-up";

import { Formatter, formatters } from "./formatters.js";

export async function resolveFormatter(
	cwd = ".",
): Promise<Formatter | undefined> {
	const children = await fs.readdir(cwd);

	for (const child of children) {
		for (const formatter of formatters) {
			if (formatter.testers.configFile.test(child)) {
				return formatter;
			}
		}
	}

	const packageData = await readPackageUp({ cwd });
	if (!packageData) {
		return undefined;
	}

	const { scripts = {}, ...otherKeys } = packageData.packageJson;

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

	return undefined;
}
