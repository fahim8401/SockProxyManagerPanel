import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, Zap, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/ui/sidebar";

interface ProvisionedUser {
  id: string;
  username: string;
  password: string;
  ipAddress: string;
  port: number;
  dataLimitGB: number;
  expiresAt: string;
}

interface ProvisionResponse {
  message: string;
  users: ProvisionedUser[];
  totalProvisioned: number;
}

export default function UserProvisioning() {
  const [count, setCount] = useState(1);
  const [dataLimitGB, setDataLimitGB] = useState(10);
  const [daysValid, setDaysValid] = useState(30);
  const [prefix, setPrefix] = useState("user");
  const [provisionedUsers, setProvisionedUsers] = useState<ProvisionedUser[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const provisionMutation = useMutation({
    mutationFn: async (data: { count: number; dataLimitGB: number; daysValid: number; prefix: string }) => {
      return await apiRequest("POST", "/api/provision-user", data) as ProvisionResponse;
    },
    onSuccess: (data) => {
      setProvisionedUsers(data.users);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: `Successfully provisioned ${data.totalProvisioned} user(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to provision users",
        variant: "destructive",
      });
    },
  });

  const handleProvision = () => {
    if (count < 1 || count > 100) {
      toast({
        title: "Invalid Count",
        description: "Count must be between 1 and 100",
        variant: "destructive",
      });
      return;
    }

    provisionMutation.mutate({ count, dataLimitGB, daysValid, prefix });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const exportUsers = () => {
    if (provisionedUsers.length === 0) return;

    const csvContent = [
      "Username,Password,IP Address,Port,Data Limit (GB),Expires At",
      ...provisionedUsers.map(user => 
        `${user.username},${user.password},${user.ipAddress},${user.port},${user.dataLimitGB},${new Date(user.expiresAt).toLocaleDateString()}`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `provisioned-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">User Provisioning</h1>
              <p className="text-sm text-gray-600">Automatically create multiple SOCKS5 users</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Provisioning Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Automated User Provisioning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label htmlFor="count">Number of Users</Label>
                    <Input
                      id="count"
                      type="number"
                      min={1}
                      max={100}
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dataLimit">Data Limit (GB)</Label>
                    <Select value={dataLimitGB.toString()} onValueChange={(value) => setDataLimitGB(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 GB</SelectItem>
                        <SelectItem value="5">5 GB</SelectItem>
                        <SelectItem value="10">10 GB</SelectItem>
                        <SelectItem value="25">25 GB</SelectItem>
                        <SelectItem value="50">50 GB</SelectItem>
                        <SelectItem value="100">100 GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="daysValid">Valid for (Days)</Label>
                    <Select value={daysValid.toString()} onValueChange={(value) => setDaysValid(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                        <SelectItem value="365">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="prefix">Username Prefix</Label>
                    <Input
                      id="prefix"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="user"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleProvision}
                  disabled={provisionMutation.isPending}
                  className="w-full md:w-auto"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {provisionMutation.isPending ? "Provisioning..." : `Provision ${count} User${count > 1 ? 's' : ''}`}
                </Button>
              </CardContent>
            </Card>

            {/* Provisioned Users Results */}
            {provisionedUsers.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Provisioned Users ({provisionedUsers.length})</CardTitle>
                  <Button onClick={exportUsers} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Username</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Data Limit</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provisionedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">{user.username}</TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="blur-sm hover:blur-none transition-all cursor-pointer">
                                {user.password}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(user.password)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{user.ipAddress}</TableCell>
                          <TableCell>{user.port}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.dataLimitGB} GB</Badge>
                          </TableCell>
                          <TableCell>{new Date(user.expiresAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`${user.username}:${user.password}@${user.ipAddress}:${user.port}`)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Config
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Usage Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Batch Provisioning:</strong> Create multiple SOCKS5 users instantly with consistent settings.
                  </div>
                  <div>
                    <strong>Automatic IP Assignment:</strong> Users are automatically assigned available IP addresses from the pool.
                  </div>
                  <div>
                    <strong>Export Options:</strong> Download user credentials as CSV for distribution or integration.
                  </div>
                  <div>
                    <strong>Integration Ready:</strong> Use the API endpoint <code>/api/provision-user</code> for automated provisioning.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}