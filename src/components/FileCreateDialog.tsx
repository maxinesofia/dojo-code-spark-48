import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface FileCreateDialogProps {
  onCreateFile: (fileName: string, fileType: string) => void;
}

export function FileCreateDialog({ onCreateFile }: FileCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("javascript");

  const fileTypes = [
    { value: "javascript", label: "JavaScript (.js)", extension: ".js" },
    { value: "typescript", label: "TypeScript (.ts)", extension: ".ts" },
    { value: "react-js", label: "React Component (.jsx)", extension: ".jsx" },
    { value: "react-ts", label: "React TypeScript (.tsx)", extension: ".tsx" },
    { value: "html", label: "HTML (.html)", extension: ".html" },
    { value: "css", label: "CSS (.css)", extension: ".css" },
    { value: "json", label: "JSON (.json)", extension: ".json" },
    { value: "text", label: "Text File (.txt)", extension: ".txt" },
  ];

  const handleSubmit = () => {
    if (!fileName.trim()) return;
    
    const selectedType = fileTypes.find(type => type.value === fileType);
    const extension = selectedType?.extension || ".js";
    const fullFileName = fileName.includes('.') ? fileName : fileName + extension;
    
    onCreateFile(fullFileName, fileType);
    setFileName("");
    setFileType("javascript");
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Plus className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="filename">File Name</Label>
            <Input
              id="filename"
              placeholder="Enter file name..."
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filetype">File Type</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger>
                <SelectValue placeholder="Select file type" />
              </SelectTrigger>
              <SelectContent>
                {fileTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!fileName.trim()}>
            Create File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}