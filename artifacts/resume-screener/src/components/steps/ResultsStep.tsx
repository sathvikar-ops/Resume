import React, { useState } from 'react';
import { WizardData } from '@/hooks/use-wizard';
import { ScoreChip } from '../ScoreChip';
import { Download, ChevronDown, ChevronUp, Briefcase, GraduationCap, Award, Mail, Phone, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ResultsStepProps {
  data: WizardData;
}

export function ResultsStep({ data }: ResultsStepProps) {
  const { toast } = useToast();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`${import.meta.env.BASE_URL}api/download-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: data.results }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_screening_results_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Download complete",
        description: "Your results Excel file has been downloaded.",
      });
    } catch (err) {
      toast({
        title: "Download failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Sort results by score descending
  const sortedResults = [...(data.results || [])].sort((a, b) => b.score - a.score);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Analysis Complete</h2>
          <p className="text-muted-foreground mt-1">
            Processed <span className="font-semibold text-primary">{data.resumes.length}</span> resumes. 
            Found <span className="font-semibold text-emerald-600">{sortedResults.filter(r => r.score >= 7.5).length}</span> strong matches.
          </p>
        </div>
        <Button onClick={handleDownload} disabled={isDownloading || sortedResults.length === 0} className="shrink-0">
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? "Generating..." : "Download Excel"}
        </Button>
      </div>

      <div className="space-y-4">
        {sortedResults.map((result, idx) => {
          const isExpanded = expandedRow === idx;
          const isFit = result.role_fit.toUpperCase() === "YES" || result.role_fit.toUpperCase() === "TRUE";

          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                isExpanded ? "border-primary shadow-lg shadow-primary/5" : "border-border shadow-sm hover:border-primary/30"
              )}
            >
              {/* Row Header */}
              <div 
                className="p-5 cursor-pointer flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedRow(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-[250px]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-700 font-bold text-lg border border-blue-200 shadow-inner">
                    {result.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{result.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {result.email || 'N/A'}</span>
                      <span className="hidden sm:flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {result.college || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:block flex-1 min-w-[200px]">
                   <p className="text-sm font-medium text-foreground line-clamp-1">{result.best_role || result.suggested_role || 'General Fit'}</p>
                   <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{result.summary}</p>
                </div>

                <div className="flex items-center gap-4 lg:gap-8 ml-auto shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Role Fit</p>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full border",
                      isFit ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {isFit ? 'YES' : 'NO'}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Score</p>
                    <ScoreChip score={result.score} />
                  </div>

                  <div className="text-muted-foreground ml-2">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-100 bg-slate-50/50"
                  >
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Left Col */}
                      <div className="space-y-6">
                        <div>
                           <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                             <Sparkles className="w-4 h-4 text-primary" /> AI Summary
                           </h4>
                           <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
                        </div>
                        <div>
                           <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                             <Briefcase className="w-4 h-4 text-primary" /> Skill Gap
                           </h4>
                           <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100 leading-relaxed">
                             {result.skill_gap || "No major skill gaps identified."}
                           </p>
                        </div>
                      </div>

                      {/* Middle Col */}
                      <div className="space-y-6">
                        <div>
                           <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                             <Award className="w-4 h-4 text-primary" /> Skills Found
                           </h4>
                           <div className="flex flex-wrap gap-2">
                             {result.skills_found && result.skills_found.length > 0 ? (
                               result.skills_found.map(skill => (
                                 <span key={skill} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md shadow-sm">
                                   {skill}
                                 </span>
                               ))
                             ) : (
                               <span className="text-sm text-muted-foreground">No specific skills extracted.</span>
                             )}
                           </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                           <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Suggested Role</h4>
                           <p className="font-semibold text-foreground">{result.suggested_role || result.best_role || 'Not specified'}</p>
                        </div>
                      </div>

                      {/* Right Col */}
                      <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
                         <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Candidate Details</h4>
                         
                         <div className="space-y-3">
                           <div className="flex items-start gap-3 text-sm">
                             <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                             <span className="text-foreground break-all">{result.email || 'N/A'}</span>
                           </div>
                           <div className="flex items-start gap-3 text-sm">
                             <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                             <span className="text-foreground">{result.phone || 'N/A'}</span>
                           </div>
                           <div className="flex items-start gap-3 text-sm">
                             <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                             <div>
                               <p className="text-foreground font-medium">{result.college || 'Unknown College'}</p>
                               <p className="text-muted-foreground">{result.degree || 'Degree unspecified'} {result.graduation_year ? `(${result.graduation_year})` : ''}</p>
                             </div>
                           </div>
                           {result.resume_link && (
                             <div className="pt-3 mt-3 border-t border-slate-100">
                               <a href={result.resume_link} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                                 View Original Resume
                               </a>
                             </div>
                           )}
                         </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
