import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const shouldWrite = process.argv.includes("--write");
const questionBankPath = resolve(process.cwd(), "data/question-bank.json");
const rawQuestionBank = JSON.parse(readFileSync(questionBankPath, "utf8"));

const phaseOrder = [
  "Choc hémorragique",
  "Choc septique",
  "Choc anaphylactique",
  "Choc cardiogénique",
];

const groupedCases = new Map(phaseOrder.map((shockType) => [shockType, []]));
const warnings = [];

function getCorrectShockType(clinicalCase, sourcePhase) {
  if (!Array.isArray(clinicalCase.options) && sourcePhase?.shockType) {
    return sourcePhase.shockType;
  }

  const correctOptions = Array.isArray(clinicalCase.options)
    ? clinicalCase.options.filter((option) => option.isCorrect)
    : [];

  if (correctOptions.length !== 1) {
    throw new Error(
      `Clinical case ${clinicalCase.id} must have exactly one correct diagnostic option; found ${correctOptions.length}.`
    );
  }

  return correctOptions[0].text;
}

function getTitleSuffix(title) {
  const [, ...suffixParts] = String(title || "").split(" - ");
  return suffixParts.join(" - ").trim();
}

function stripDiagnosticQuestion(clinicalCase, shockType) {
  if (!Array.isArray(clinicalCase.priseEnChargeCorrectIds)) {
    throw new Error(`Clinical case ${clinicalCase.id} is missing priseEnChargeCorrectIds.`);
  }

  const caseWithoutDiagnostic = { ...clinicalCase };
  delete caseWithoutDiagnostic.question;
  delete caseWithoutDiagnostic.options;
  delete caseWithoutDiagnostic.difficulty;
  const titleSuffix = getTitleSuffix(clinicalCase.title);
  const expectedTitle = titleSuffix ? `${shockType} - ${titleSuffix}` : clinicalCase.title;

  if (clinicalCase.title !== expectedTitle) {
    warnings.push(`${clinicalCase.id}: title changed from "${clinicalCase.title}" to "${expectedTitle}".`);
  }

  return {
    ...caseWithoutDiagnostic,
    title: expectedTitle,
  };
}

for (const phase of rawQuestionBank.phases || []) {
  for (const clinicalCase of phase.cases || []) {
    const shockType = getCorrectShockType(clinicalCase, phase);

    if (!groupedCases.has(shockType)) {
      groupedCases.set(shockType, []);
      phaseOrder.push(shockType);
    }

    groupedCases.get(shockType).push(stripDiagnosticQuestion(clinicalCase, shockType));
  }
}

const phases = phaseOrder
  .filter((shockType) => (groupedCases.get(shockType) || []).length > 0)
  .map((shockType, index) => ({
    id: `phase-${index + 1}`,
    name: `Phase ${index + 1} - ${shockType}`,
    shockType,
    cases: groupedCases.get(shockType),
  }));

const originalCaseCount = rawQuestionBank.phases.reduce(
  (sum, phase) => sum + (phase.cases?.length || 0),
  0
);
const restructuredCaseCount = phases.reduce((sum, phase) => sum + phase.cases.length, 0);

if (originalCaseCount !== restructuredCaseCount) {
  throw new Error(
    `Case count mismatch: expected ${originalCaseCount}, generated ${restructuredCaseCount}.`
  );
}

const restructuredQuestionBank = {
  ...rawQuestionBank,
  version: "1.1.0",
  meta: {
    ...rawQuestionBank.meta,
    notes:
      "Quiz médical sur les différents types de chocs. Cas cliniques regroupés par type de choc; diagnostic retiré des cas cliniques.",
  },
  phases,
};

const output = `${JSON.stringify(restructuredQuestionBank, null, 2)}\n`;

console.log(`Clinical cases processed: ${restructuredCaseCount}`);
for (const phase of phases) {
  console.log(`${phase.name}: ${phase.cases.length} case(s)`);
}

if (warnings.length > 0) {
  console.warn("\nWarnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (shouldWrite) {
  writeFileSync(questionBankPath, output, "utf8");
  console.log(`\nWrote ${questionBankPath}`);
} else {
  console.log("\nDry run only. Re-run with --write to update data/question-bank.json.");
}