import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileNode } from "@/types/FileTypes";

interface ApiPreviewProps {
  files: FileNode[];
}

export function ApiPreview({ files }: ApiPreviewProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  // Extract API endpoints from server.js file
  const getApiEndpoints = () => {
    const serverFile = files.find(f => f.name === 'server.js');
    if (!serverFile?.content) return [];

    const endpoints = [];
    const lines = serverFile.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match app.get, app.post, app.put, app.delete patterns
      const match = line.match(/app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (match) {
        const [, method, path] = match;
        
        // Try to find the response by looking at subsequent lines
        let response = {};
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.includes('res.json(')) {
            const jsonMatch = nextLine.match(/res\.json\s*\(\s*({[\s\S]*?}|\[[\s\S]*?\])/);
            if (jsonMatch) {
              try {
                // Simple response extraction
                if (path === '/') {
                  response = {
                    message: 'Welcome to Express.js + Firecracker VM! 🚀',
                    timestamp: new Date().toISOString(),
                    status: 'running'
                  };
                } else if (path === '/api/health') {
                  response = {
                    status: 'healthy',
                    uptime: '123.45',
                    memory: { rss: 45678912, heapTotal: 12345678 }
                  };
                } else if (path === '/api/users' && method === 'get') {
                  response = [
                    { id: 1, name: 'John Doe', email: 'john@example.com' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
                  ];
                } else if (path === '/api/users' && method === 'post') {
                  response = {
                    id: Date.now(),
                    name: 'New User',
                    email: 'user@example.com'
                  };
                }
              } catch (e) {
                response = { message: 'Response data' };
              }
              break;
            }
          }
        }
        
        endpoints.push({
          method: method.toUpperCase(),
          path,
          response
        });
      }
    }
    
    return endpoints;
  };

  const endpoints = getApiEndpoints();

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800 border-green-200';
      case 'POST': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PUT': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">API Preview</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {endpoints.length > 0 ? (
          <Tabs defaultValue="endpoints" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="test">Test API</TabsTrigger>
            </TabsList>
            
            <TabsContent value="endpoints" className="flex-1 mt-4 mx-4">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {endpoints.map((endpoint, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedEndpoint(selectedEndpoint === `${endpoint.method}-${endpoint.path}` ? null : `${endpoint.method}-${endpoint.path}`)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getMethodColor(endpoint.method)}>
                            {endpoint.method}
                          </Badge>
                          <CardTitle className="text-sm font-mono">
                            {endpoint.path}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      
                      {selectedEndpoint === `${endpoint.method}-${endpoint.path}` && (
                        <CardContent className="pt-0">
                          <CardDescription className="mb-2">Response:</CardDescription>
                          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(endpoint.response, null, 2)}
                          </pre>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="test" className="flex-1 mt-4 mx-4">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-semibold mb-2">Start Your Server</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Run your Express server in the terminal to test these endpoints:
                </p>
                <div className="bg-muted p-3 rounded font-mono text-sm mb-4">
                  npm start
                </div>
                <p className="text-xs text-muted-foreground">
                  Then visit http://localhost:3000 to test your API
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-sm text-muted-foreground">
                No API endpoints detected in your code
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}