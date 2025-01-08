import { formatly } from "./formatly.js";

export async function cli(args: string[]) {
	const result = await formatly(args);

	if (result.ran) {
		return 0;
	}

	console.error(result.message);
	return 1;
}
