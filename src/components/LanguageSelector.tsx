import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Code, Server, Globe } from "lucide-react";

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  files: any[];
}

export const LanguageSelector = ({ selectedLanguage, onLanguageChange, files }: LanguageSelectorProps) => {
  const languages = [
    // Client-side languages
    { value: 'javascript', label: 'JavaScript', type: 'client', icon: Globe },
    { value: 'typescript', label: 'TypeScript', type: 'client', icon: Globe },
    { value: 'html', label: 'HTML/CSS/JS', type: 'client', icon: Globe },
    
    // Server-side languages (Firecracker)
    { value: 'nodejs', label: 'Node.js', type: 'server', icon: Server },
    { value: 'react', label: 'React', type: 'server', icon: Server },
    { value: 'python', label: 'Python', type: 'server', icon: Server },
    { value: 'c', label: 'C', type: 'server', icon: Server },
    { value: 'cpp', label: 'C++', type: 'server', icon: Server },
    { value: 'bash', label: 'Bash/Shell', type: 'server', icon: Server },
  ];

  const getLanguageIcon = (type: string) => {
    switch (type) {
      case 'server':
        return <Server className="w-4 h-4" />;
      case 'client':
        return <Globe className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getLanguageBadge = (type: string) => {
    switch (type) {
      case 'server':
        return <Badge variant="secondary" className="text-xs">Firecracker VM</Badge>;
      case 'client':
        return <Badge variant="outline" className="text-xs">Browser</Badge>;
      default:
        return null;
    }
  };

  // Auto-detect language based on files
  const detectLanguage = () => {
    if (!files.length) return 'javascript';
    
    const fileNames = files.map(f => f.name?.toLowerCase() || '');
    const fileContents = files.map(f => f.content || '').join('\n');


    // React detection
    if (fileNames.some(name => name.includes('.jsx') || name.includes('.tsx')) ||
        fileContents.includes('import React') ||
        fileContents.includes('useState')) {
      return 'react';
    }

    // Node.js detection
    if (fileNames.includes('package.json') && 
        (fileNames.includes('server.js') || fileContents.includes('express'))) {
      return 'nodejs';
    }

    // Other languages
    if (fileNames.some(name => name.endsWith('.py'))) return 'python';
    if (fileNames.some(name => name.endsWith('.c'))) return 'c';
    if (fileNames.some(name => name.endsWith('.cpp'))) return 'cpp';
    if (fileNames.some(name => name.endsWith('.sh'))) return 'bash';
    if (fileNames.some(name => name.endsWith('.ts'))) return 'typescript';

    return 'javascript';
  };

  const detectedLanguage = detectLanguage();
  const currentLang = languages.find(lang => lang.value === selectedLanguage);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedLanguage} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">Client-side (Browser)</div>
            {languages.filter(lang => lang.type === 'client').map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {lang.label}
                </div>
              </SelectItem>
            ))}
            <div className="text-xs font-medium text-muted-foreground mb-2 mt-3">Server-side (Firecracker VM)</div>
            {languages.filter(lang => lang.type === 'server').map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  {lang.label}
                </div>
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
      
      {currentLang && (
        <div className="flex items-center gap-2">
          {getLanguageIcon(currentLang.type)}
          {getLanguageBadge(currentLang.type)}
        </div>
      )}
      
      {detectedLanguage !== selectedLanguage && (
        <Badge 
          variant="outline" 
          className="text-xs cursor-pointer hover:bg-muted"
          onClick={() => onLanguageChange(detectedLanguage)}
        >
          Auto: {languages.find(l => l.value === detectedLanguage)?.label}
        </Badge>
      )}
    </div>
  );
};
