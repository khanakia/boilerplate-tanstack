import { env } from "@/env/server";

export function getBuildInfo() {
	return {
		version: env.VITE_APP_VERSION,
		commit: env.VITE_APP_COMMIT,
		branch: env.VITE_APP_BRANCH,
		buildTime: env.VITE_APP_BUILD_TIME,
	};
}
