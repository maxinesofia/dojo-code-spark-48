import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";

interface FileCreateDialogProps {
  onCreateFile: (fileName: string, fileType: string) => void;
  onCreateFolder: (folderName: string) => void;
}

export function FileCreateDialog({ onCreateFile, onCreateFolder }: FileCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("javascript");
  const [createType, setCreateType] = useState<"file" | "folder">("file");

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
    
    if (createType === "folder") {
      onCreateFolder(fileName.trim());
    } else {
      const selectedType = fileTypes.find(type => type.value === fileType);
      const extension = selectedType?.extension || ".js";
      const fullFileName = fileName.includes('.') ? fileName : fileName + extension;
      onCreateFile(fullFileName, fileType);
    }
    
    setFileName("");
    setFileType("javascript");
    setCreateType("file");
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
          <DialogTitle>Create New {createType === "file" ? "File" : "Folder"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-3">
            <Label>Type</Label>
            <RadioGroup value={createType} onValueChange={(value: "file" | "folder") => setCreateType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="file" id="file" />
                <Label htmlFor="file">File</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="folder" id="folder" />
                <Label htmlFor="folder">Folder</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filename">{createType === "file" ? "File" : "Folder"} Name</Label>
            <Input
              id="filename"
              placeholder={`Enter ${createType} name...`}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
          </div>
          {createType === "file" && (
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
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!fileName.trim()}>
            Create {createType === "file" ? "File" : "Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}