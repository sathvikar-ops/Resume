import React, { useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, FileText } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  accept?: DropzoneOptions['accept'];
  title?: string;
  description?: string;
  required?: boolean;
}

export function FileDropzone({
  files,
  onChange,
  maxFiles = 0,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  },
  title = "Upload files",
  description = "Drag & drop files here, or click to select files",
  required = false
}: FileDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (maxFiles === 1) {
      onChange(acceptedFiles.slice(0, 1));
    } else {
      onChange([...files, ...acceptedFiles]);
    }
  }, [files, onChange, maxFiles]);

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles > 0 ? maxFiles : undefined
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {title}
          {required && <span className="text-destructive text-xs">*</span>}
        </h3>
        {files.length > 0 && maxFiles !== 1 && (
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
            {files.length} selected
          </span>
        )}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative overflow-hidden group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ease-out",
          isDragActive 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-slate-50",
          files.length > 0 && maxFiles === 1 && "hidden"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className={cn(
            "p-4 rounded-full transition-colors duration-300",
            isDragActive ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary/20"
          )}>
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 10MB</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 mt-4"
          >
            {files.map((file, idx) => (
              <motion.div
                key={`${file.name}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-3 bg-white border border-border rounded-xl shadow-sm group hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
