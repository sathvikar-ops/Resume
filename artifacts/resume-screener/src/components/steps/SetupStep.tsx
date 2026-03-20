import React from 'react';
import { WizardData } from '@/hooks/use-wizard';
import { TagInput } from '../TagInput';
import { FileDropzone } from '../FileDropzone';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const AVAILABLE_ROLES = [
  "SDE Backend",
  "SDE Frontend",
  "AI/ML Engineer",
  "Product Solution Engineer",
  "QA Engineer",
  "DevOps Engineer",
  "Data Scientist"
];

interface SetupStepProps {
  data: WizardData;
  updateData: (data: Partial<WizardData>) => void;
}

export function SetupStep({ data, updateData }: SetupStepProps) {
  const toggleRole = (role: string) => {
    if (data.roles.includes(role)) {
      updateData({ roles: data.roles.filter(r => r !== role) });
    } else {
      updateData({ roles: [...data.roles, role] });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border">
        <div className="mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Target Roles</h2>
          <p className="text-sm text-muted-foreground mt-1">Select the positions you are hiring for. You must select at least one.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_ROLES.map(role => {
            const isSelected = data.roles.includes(role);
            return (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 flex items-center gap-2",
                  isSelected 
                    ? "bg-primary/5 border-primary text-primary shadow-sm" 
                    : "bg-white border-border text-foreground hover:border-primary/30 hover:bg-slate-50"
                )}
              >
                {isSelected && <Check className="w-4 h-4" />}
                {role}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border">
        <div className="mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Custom Keywords</h2>
          <p className="text-sm text-muted-foreground mt-1">Add specific technical skills, certifications, or tools you want the AI to look for.</p>
        </div>
        <TagInput 
          tags={data.customKeywords} 
          onChange={(tags) => updateData({ customKeywords: tags })}
          placeholder="e.g. React, Node.js, AWS Certified, Python..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border space-y-6">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground mb-1">Job Context</h2>
            <p className="text-sm text-muted-foreground">Upload descriptions and company info to guide the AI.</p>
          </div>
          
          <FileDropzone 
            title="Job Descriptions"
            description="Upload JD documents"
            files={data.jobDescriptions}
            onChange={(files) => updateData({ jobDescriptions: files })}
          />
          
          <div className="pt-4 border-t border-border">
            <FileDropzone 
              title="Company Info"
              description="Upload company profile (optional)"
              files={data.companyInfo ? [data.companyInfo] : []}
              onChange={(files) => updateData({ companyInfo: files[0] || null })}
              maxFiles={1}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border flex flex-col h-full">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground mb-1">Prior Shortlists</h2>
            <p className="text-sm text-muted-foreground">Upload examples of good resumes to train the AI's standard (Optional).</p>
          </div>
          <div className="mt-6 flex-1">
            <FileDropzone 
              title="Shortlisted Examples"
              description="Upload past successful resumes"
              files={data.shortlistedResumes}
              onChange={(files) => updateData({ shortlistedResumes: files })}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
