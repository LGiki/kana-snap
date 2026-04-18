import { describe, expect, it } from "vitest";
import { getHandwritingLoadStatusKey } from "./HandwritingModelLoading";

describe("getHandwritingLoadStatusKey", () => {
	it("maps runtime loading to the runtime message", () => {
		expect(
			getHandwritingLoadStatusKey({
				stage: "loadingRuntime",
				progress: 24,
			}),
		).toBe("handwritingLoader.statusRuntime");
	});

	it("maps model download to the model message", () => {
		expect(
			getHandwritingLoadStatusKey({
				stage: "loadingModel",
				progress: 78,
			}),
		).toBe("handwritingLoader.statusModel");
	});

	it("maps initialization to the final setup message", () => {
		expect(
			getHandwritingLoadStatusKey({
				stage: "initializingModel",
				progress: 97,
			}),
		).toBe("handwritingLoader.statusInitializing");
	});
});
