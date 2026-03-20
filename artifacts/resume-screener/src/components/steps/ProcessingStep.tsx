import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, BrainCircuit, FileSearch, CheckCircle2 } from 'lucide-react';

const MESSAGES = [
  { text: "Initializing AI Engine...", icon: BrainCircuit },
  { text: "Parsing candidate resumes...", icon: FileSearch },
  { text: "Extracting skills and experience...", icon: Loader2 },
  { text: "Evaluating against job requirements...", icon: BrainCircuit },
  { text: "Calculating match scores...", icon: Loader2 },
  { text: "Generating final summaries...", icon: FileSearch },
];

interface ProcessingStepProps {
  isError: boolean;
}

export function ProcessingStep({ isError }: ProcessingStepProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (isError) return;
    
    // Cycle through messages, pausing longer on the later ones
    const interval = setInterval(() => {
      setMsgIndex((current) => {
        if (current < MESSAGES.length - 1) return current + 1;
        return current; // Stay on the last message until API resolves
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isError]);

  const CurrentIcon = MESSAGES[msgIndex].icon;

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-rose-500/20">
          <X className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Analysis Failed</h2>
        <p className="text-muted-foreground max-w-md">There was a problem communicating with the AI engine. Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
         <div className="w-[40vw] h-[40vw] bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
      </div>
      
      <div className="relative z-10 text-center">
        <motion.div 
          className="relative w-32 h-32 mx-auto mb-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" style={{ animationDuration: '2s' }}></div>
          
          <div className="absolute inset-0 flex items-center justify-center bg-white rounded-full m-2 shadow-lg">
             <CurrentIcon className="w-10 h-10 text-primary animate-pulse" />
          </div>
        </motion.div>

        <div className="h-16 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <h3 className="text-2xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">
                {MESSAGES[msgIndex].text}
              </h3>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <p className="text-muted-foreground mt-4 font-medium">This may take 30-60 seconds depending on volume.</p>
        
        <div className="w-64 h-2 bg-slate-100 rounded-full mx-auto mt-8 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 30, ease: "circOut" }} // Fake progress bar
          />
        </div>
      </div>
    </div>
  );
}

// Needed to add X icon here for the error state since it wasn't imported at top
import { X } from 'lucide-react';
