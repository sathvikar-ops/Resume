import { useState } from 'react';
import type { CandidateResult } from '@workspace/api-client-react/src/generated/api.schemas';

export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardData {
  roles: string[];
  customKeywords: string[];
  jobDescriptions: File[];
  companyInfo: File | null;
  shortlistedResumes: File[];
  resumes: File[];
  results: CandidateResult[];
}

const initialData: WizardData = {
  roles: [],
  customKeywords: [],
  jobDescriptions: [],
  companyInfo: null,
  shortlistedResumes: [],
  resumes: [],
  results: [],
};

export function useWizard() {
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>(initialData);

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4) as WizardStep);
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as WizardStep);
  const goToStep = (s: WizardStep) => setStep(s);
  const resetWizard = () => {
    setData(initialData);
    setStep(1);
  };

  return {
    step,
    data,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    resetWizard,
  };
}
