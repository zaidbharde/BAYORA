import type { LlmAnalysisRequest, LlmAnalysisResponse, LlmStatusResponse, TestRunSummary } from "@bayora/shared";

export interface LLMProvider {
  readonly name: string;
  getStatus(recentTests: TestRunSummary[]): LlmStatusResponse;
  analyze(request: LlmAnalysisRequest): LlmAnalysisResponse;
}

export class MockLLMProvider implements LLMProvider {
  readonly name = "MockLLMProvider";

  getStatus(recentTests: TestRunSummary[]): LlmStatusResponse {
    return {
      modelStatus: "Local adapter available",
      connectionStatus: "local",
      evaluationStatus: "ready",
      provider: this.name,
      recentTests
    };
  }

  analyze(request: LlmAnalysisRequest): LlmAnalysisResponse {
    const input = request.input.toLowerCase();
    const notes: string[] = [];

    if (input.includes("ignore") || input.includes("override")) {
      notes.push("Input contains instruction override language.");
    }

    if (input.includes("secret") || input.includes("token") || input.includes("password")) {
      notes.push("Input contains potential exposure terms.");
    }

    if (!notes.length) {
      notes.push("Input remains within controlled evaluation scope.");
    }

    return {
      summary: `${request.scenarioName} reviewed by the local model adapter.`,
      confidence: notes.some((note) => note.includes("exposure")) ? 0.9 : 0.74,
      notes
    };
  }
}

export class LLMService {
  constructor(private readonly provider: LLMProvider) {}

  getStatus(recentTests: TestRunSummary[]): LlmStatusResponse {
    return this.provider.getStatus(recentTests);
  }

  analyze(request: LlmAnalysisRequest): LlmAnalysisResponse {
    return this.provider.analyze(request);
  }
}
export interface LlmModule {
  readonly name: "llm";
}

export const llmModule: LlmModule = {
  name: "llm"
};

