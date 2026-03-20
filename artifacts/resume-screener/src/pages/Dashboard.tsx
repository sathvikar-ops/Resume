import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useWizard } from '@/hooks/use-wizard';
import { SetupStep } from '@/components/steps/SetupStep';
import { UploadStep } from '@/components/steps/UploadStep';
import { ProcessingStep } from '@/components/steps/ProcessingStep';
import { ResultsStep } from '@/components/steps/ResultsStep';
import { Button } from '@/components/ui/button';
import { Brain, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CandidateResult } from '@workspace/api-client-react/src/generated/api.schemas';

export default function Dashboard() {
  const wizard = useWizard();
  const { toast } = useToast();
  const [isError, setIsError] = useState(false);

  const handleNext = () => {
    if (wizard.step === 1 && wizard.data.roles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one role.",
        variant: "destructive"
      });
      return;
    }
    wizard.nextStep();
  };

  const handleStartAnalysis = async () => {
    if (wizard.data.resumes.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please upload at least one candidate resume.",
        variant: "destructive"
      });
      return;
    }

    setIsError(false);
    wizard.goToStep(3);

    try {
      const formData = new FormData();
      formData.append('roles', JSON.stringify(wizard.data.roles));
      formData.append('customKeywords', JSON.stringify(wizard.data.customKeywords));

      wizard.data.jobDescriptions.forEach((file) => {
        formData.append('jobDescriptions', file);
      });

      if (wizard.data.companyInfo) {
        formData.append('companyInfo', wizard.data.companyInfo);
      }

      wizard.data.shortlistedResumes.forEach((file) => {
        formData.append('shortlistedResumes', file);
      });

      wizard.data.resumes.forEach((file) => {
        formData.append('resumes', file);
      });

      const response = await fetch(`${import.meta.env.BASE_URL}api/screen`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data: { results: CandidateResult[]; processedCount: number } = await response.json();
      wizard.updateData({ results: data.results });
      wizard.goToStep(4);
    } catch (err) {
      console.error("Screening failed", err);
      setIsError(true);
      toast({
        title: "Analysis Failed",
        description: String(err) || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stepTitles = [
    "Criteria Setup",
    "Upload Resumes",
    "AI Analysis",
    "Results"
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden pb-20">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-40 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-mark.png`}
              alt="Logo"
              className="w-10 h-10 object-contain drop-shadow-md rounded-xl"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Talent<span className="text-primary">Lens</span></h1>
              <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mt-0.5">AI Resume Engine</p>
            </div>
          </div>

          {wizard.step === 4 && (
            <Button variant="outline" size="sm" onClick={wizard.resetWizard}>
              <RefreshCw className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          )}
        </header>

        {/* Progress Stepper */}
        {wizard.step < 4 && (
          <div className="mb-12">
            <div className="flex items-center justify-between max-w-2xl mx-auto relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500 ease-out"
                style={{ width: `${((wizard.step - 1) / 3) * 100}%` }}
              ></div>

              {[1, 2, 3, 4].map((s) => {
                const isActive = wizard.step === s;
                const isPast = wizard.step > s;
                return (
                  <div key={s} className="relative z-10 flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 shadow-sm",
                      isActive ? "bg-primary text-white ring-4 ring-primary/20" :
                      isPast ? "bg-primary text-white" : "bg-white text-slate-400 border-2 border-slate-200"
                    )}>
                      {s}
                    </div>
                    <span className={cn(
                      "absolute top-12 whitespace-nowrap text-xs font-semibold",
                      isActive ? "text-primary" : isPast ? "text-slate-700" : "text-slate-400"
                    )}>
                      {stepTitles[s-1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="min-h-[500px]">
          {wizard.step === 1 && <SetupStep data={wizard.data} updateData={wizard.updateData} />}
          {wizard.step === 2 && <UploadStep data={wizard.data} updateData={wizard.updateData} />}
          {wizard.step === 3 && <ProcessingStep isError={isError} />}
          {wizard.step === 4 && <ResultsStep data={wizard.data} />}
        </main>

        {/* Footer Actions */}
        {wizard.step < 3 && (
          <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={wizard.prevStep}
              disabled={wizard.step === 1}
              className={wizard.step === 1 ? 'opacity-0' : ''}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            {wizard.step === 1 ? (
              <Button size="lg" onClick={handleNext} className="min-w-[160px]">
                Next Step <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button size="lg" onClick={handleStartAnalysis} className="min-w-[160px]">
                <Brain className="w-5 h-5 mr-2" /> Start Analysis
              </Button>
            )}
          </div>
        )}

        {wizard.step === 3 && isError && (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" size="lg" onClick={() => wizard.goToStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back and Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
