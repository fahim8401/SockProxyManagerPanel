import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Key, Trash2, Eye, EyeOff, Plus, Code, Book, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/ui/sidebar";
import { ApiKey } from "@shared/schema";

export default function ApiManagement() {
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["/api/api-keys"],
  }) as { data: ApiKey[]; isLoading: boolean };

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest("POST", "/api/api-keys", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setShowNewKeyForm(false);
      setNewKeyName("");
      toast({
        title: "API Key Created",
        description: `New API key "${data.name}" created successfully. Make sure to copy the key as it won't be shown again.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "API key deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }
    createKeyMutation.mutate({ name: newKeyName.trim() });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const formatDate = (timestamp: number | Date | null) => {
    if (!timestamp) return "Never";
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">API Management</h1>
              <p className="text-sm text-gray-600">Manage API keys and access external integration endpoints</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="keys" className="space-y-6">
            <TabsList>
              <TabsTrigger value="keys" className="flex items-center">
                <Key className="h-4 w-4 mr-2" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="endpoints" className="flex items-center">
                <Code className="h-4 w-4 mr-2" />
                Endpoints
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="docs" className="flex items-center">
                <Book className="h-4 w-4 mr-2" />
                Documentation
              </TabsTrigger>
            </TabsList>

            {/* API Keys Tab */}
            <TabsContent value="keys" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2" />
                      API Keys
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Create and manage API keys for external access
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowNewKeyForm(true)}
                    className="flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Key
                  </Button>
                </CardHeader>
                <CardContent>
                  {showNewKeyForm && (
                    <Card className="mb-6 bg-gray-50">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="keyName">API Key Name</Label>
                            <Input
                              id="keyName"
                              placeholder="Enter a descriptive name"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              onClick={handleCreateKey}
                              disabled={createKeyMutation.isPending}
                            >
                              {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowNewKeyForm(false);
                                setNewKeyName("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {isLoading ? (
                    <div className="text-center py-8">Loading API keys...</div>
                  ) : apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No API keys created yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Key</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Used</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiKeys.map((key) => (
                          <TableRow key={key.id}>
                            <TableCell className="font-medium">{key.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {visibleKeys.has(key.id) 
                                    ? key.keyHash 
                                    : "sk-" + "•".repeat(32)
                                  }
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleKeyVisibility(key.id)}
                                >
                                  {visibleKeys.has(key.id) ? 
                                    <EyeOff className="h-4 w-4" /> : 
                                    <Eye className="h-4 w-4" />
                                  }
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(key.keyHash)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={key.isActive ? "default" : "secondary"}>
                                {key.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(key.createdAt)}</TableCell>
                            <TableCell>
                              {key.lastUsed ? formatDate(key.lastUsed) : "Never"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteKeyMutation.mutate(key.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Endpoints Tab */}
            <TabsContent value="endpoints" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 mr-2" />
                    Available API Endpoints
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    RESTful API endpoints for user management operations
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-green-600">GET /api/v1/users</h3>
                        <Badge variant="outline">Public</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">List all users with their details</p>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        <strong>Headers:</strong> Authorization: Bearer YOUR_API_KEY
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-blue-600">POST /api/v1/users</h3>
                        <Badge variant="outline">Public</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Create a new SOCKS5 user</p>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        <strong>Headers:</strong> Authorization: Bearer YOUR_API_KEY<br/>
                        <strong>Body:</strong> {"{ username, password, email, dataLimit, daysValid }"}
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-red-600">DELETE /api/v1/users/:id</h3>
                        <Badge variant="outline">Public</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Delete a user by ID</p>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        <strong>Headers:</strong> Authorization: Bearer YOUR_API_KEY
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-orange-600">PATCH /api/v1/users/:id</h3>
                        <Badge variant="outline">Public</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Update user details (suspend/activate)</p>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        <strong>Headers:</strong> Authorization: Bearer YOUR_API_KEY<br/>
                        <strong>Body:</strong> {"{ isActive: false }"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Usage Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {apiKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-full">
                        <Database className="text-blue-600 w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active API Keys</p>
                        <p className="text-2xl font-bold text-green-600">
                          {apiKeys.filter(key => key.isActive).length}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-full">
                        <Key className="text-green-600 w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Rate Limit Status</p>
                        <p className="text-2xl font-bold text-blue-600">100/min</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-full">
                        <Activity className="text-blue-600 w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>API Usage by Key</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>API Key Name</TableHead>
                        <TableHead>Usage Count</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Rate Limit</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>{key.usageCount || 0} calls</TableCell>
                          <TableCell>{key.lastUsed ? formatDate(key.lastUsed) : "Never"}</TableCell>
                          <TableCell>100/min</TableCell>
                          <TableCell>
                            <Badge variant={key.isActive ? "default" : "secondary"}>
                              {key.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documentation Tab */}
            <TabsContent value="docs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Book className="h-5 w-5 mr-2" />
                    API Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      All API requests require authentication using API keys. Include your API key in the Authorization header:
                    </p>
                    <div className="bg-gray-900 text-white p-4 rounded-lg">
                      <code>Authorization: Bearer YOUR_API_KEY</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Base URL</h3>
                    <div className="bg-gray-900 text-white p-4 rounded-lg">
                      <code>{window.location.origin}/api/v1</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Response Format</h3>
                    <p className="text-sm text-gray-600 mb-3">All responses are in JSON format:</p>
                    <div className="bg-gray-900 text-white p-4 rounded-lg">
                      <pre>{JSON.stringify({
                        "success": true,
                        "data": "{ response_data }",
                        "message": "Success message"
                      }, null, 2)}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Error Codes</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono">400</span>
                        <span>Bad Request - Invalid parameters</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-mono">401</span>
                        <span>Unauthorized - Invalid API key</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-mono">404</span>
                        <span>Not Found - Resource not found</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-mono">500</span>
                        <span>Internal Server Error</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Rate Limiting</h3>
                    <p className="text-sm text-gray-600">
                      API requests are limited to 100 requests per minute per API key.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}