import questionBankData from "./question-bank.json";

export interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface MCQQuestion {
  id: string;
  type: "mcq";
  stem: string;
  difficulty: string;
  options: Option[];
}

export interface Patient {
  name: string;
  age: number;
  sex: string;
  atcd: string[];
}

export interface ConstantesVitales {
  ta: string;
  fc: string;
  fr: string;
  spo2: string;
  temperature?: string;
}

export interface ClinicalCase {
  id: string;
  title: string;
  patient: Patient;
  motif: string;
  etatGeneral: string[];
  constantesVitales: ConstantesVitales;
  examenClinique: string[];
  examensComplementaires: string[];
  priseEnCharge: string[];
  priseEnChargeCorrectIds: string[];
}

export interface Phase {
  id: string;
  name: string;
  shockType: string;
  cases: ClinicalCase[];
}

export interface QuestionBank {
  title: string;
  version: string;
  language: string;
  meta: {
    createdAt: string;
    notes: string;
  };
  preTest: MCQQuestion[];
  phases: Phase[];
  postTest: MCQQuestion[];
}

export const questionBank: QuestionBank = questionBankData as QuestionBank;
