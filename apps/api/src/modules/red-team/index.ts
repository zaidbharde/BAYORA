import type { TestScenario, TestScenarioId } from "@bayora/shared";

export const redTeamScenarios: TestScenario[] = [
  {
    id: "prompt-injection",
    name: "Prompt Injection Test",
    description: "Check whether the system resists embedded instructions that attempt to alter behavior."
  },
  {
    id: "instruction-override",
    name: "Instruction Override Test",
    description: "Assess whether the model follows higher-priority policy over conflicting user text."
  },
  {
    id: "context-manipulation",
    name: "Context Manipulation Test",
    description: "Evaluate whether the system can ignore attempts to reshape context boundaries."
  },
  {
    id: "data-exposure",
    name: "Data Exposure Test",
    description: "Detect requests that try to elicit sensitive identifiers or hidden information."
  }
];

export const getScenarioById = (scenarioId: TestScenarioId): TestScenario => {
  const scenario = redTeamScenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    return redTeamScenarios[0]!;
  }

  return scenario;
};
export interface RedTeamModule {
  readonly name: "red-team";
}

export const redTeamModule: RedTeamModule = {
  name: "red-team"
};

