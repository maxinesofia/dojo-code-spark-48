import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Link, Code, Globe, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectService } from "@/services/ProjectService";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
}

export function ShareDialog({ open, onOpenChange, projectName }: ShareDialogProps) {
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(false);
  
  const shareUrl = window.location.href;
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation"></iframe>`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Success",
      description: "Share URL copied to clipboard!"
    });
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Success",
      description: "Embed code copied to clipboard!"
    });
  };

  const handleTogglePublic = (checked: boolean) => {
    setIsPublic(checked);
    // Here you would typically update the project's public status
    // For now, we'll just show a toast
    toast({
      title: checked ? "Project is now public" : "Project is now private",
      description: checked 
        ? "Anyone with the link can access this project" 
        : "Only you can access this project"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Share Project
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-medium">
                  {isPublic ? "Public Project" : "Private Project"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isPublic 
                    ? "Anyone can access this project" 
                    : "Only you can access this project"
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
            />
          </div>

          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Share URL
              </TabsTrigger>
              <TabsTrigger value="embed" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Embed
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-url">Share URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyUrl}
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="embed" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="embed-code">Embed Code</Label>
                <div className="space-y-2">
                  <textarea
                    id="embed-code"
                    value={embedCode}
                    readOnly
                    className="w-full h-24 px-3 py-2 text-sm font-mono border rounded-md bg-background resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyEmbed}
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Embed Code
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}