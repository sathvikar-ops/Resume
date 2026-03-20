import React from 'react';
import { WizardData } from '@/hooks/use-wizard';
import { FileDropzone } from '../FileDropzone';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface UploadStepProps {
  data: WizardData;
  updateData: (data: Partial<WizardData>) => void;
}

export function UploadStep({ data, updateData }: UploadStepProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-blue-900/5 border border-border text-center">
        <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8" />
        </div>
        
        <h2 className="text-3xl font-display font-bold text-foreground mb-4">Upload Candidate Resumes</h2>
        <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
          Drop all candidate resumes here. Our AI will analyze them against the criteria defined in the previous step. We support PDF and Word documents.
        </p>

        <div className="text-left bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <FileDropzone 
            title="Candidate Files"
            description="Drag and drop candidate resumes here in bulk"
            files={data.resumes}
            onChange={(files) => updateData({ resumes: files })}
            required
          />
        </div>

        {data.resumes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 pt-8 border-t border-border flex justify-between items-center px-4"
          >
            <div className="text-left">
              <p className="font-semibold text-foreground">{data.resumes.length} resumes ready</p>
              <p className="text-sm text-muted-foreground">Click 'Start Analysis' below to begin.</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
               <span className="text-emerald-600 font-bold">{data.resumes.length}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
