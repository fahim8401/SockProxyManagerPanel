import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Users, Edit, Eye, Pause, Play, Calendar, Database, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/ui/sidebar";
import { Link } from "wouter";

interface User {
  id: string;
  username: string;
  email?: string;
  ipAddress: string;
  port: number;
  dataLimit: number;
  dataUsed: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  lastConnection?: string;
  daysValid: number;
}

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  }) as { data: User[]; isLoading: boolean };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/users/${userId}`, { isActive });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: `User ${isActive ? "activated" : "suspended"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(parseInt(expiresAt) * 1000) < new Date();
  };

  const getDaysRemaining = (expiresAt: string) => {
    const expiry = new Date(parseInt(expiresAt) * 1000);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">User Management</h1>
              <p className="text-sm text-gray-600">Manage SOCKS5 proxy users</p>
            </div>
            <Link href="/create-user">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Users className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">
                      <Users className="text-blue-600 w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-green-600">
                        {users.filter((user: User) => user.isActive).length}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                      <Users className="text-green-600 w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Expired Users</p>
                      <p className="text-2xl font-bold text-red-600">
                        {users.filter((user: User) => new Date(user.expiresAt) < new Date()).length}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-full">
                      <Users className="text-red-600 w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Data Limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No users found. Create your first user to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">{user.username}</TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
                          <TableCell className="font-mono">{user.ipAddress}</TableCell>
                          <TableCell>{user.port}</TableCell>
                          <TableCell>{formatBytes(user.dataLimit)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={user.isActive ? "default" : "secondary"}
                                className={
                                  user.isActive ? 
                                  "bg-green-100 text-green-800 hover:bg-green-100" : 
                                  "bg-red-100 text-red-800 hover:bg-red-100"
                                }
                              >
                                {user.isActive ? "Active" : "Suspended"}
                              </Badge>
                              {isExpired(user.expiresAt) && (
                                <Badge variant="destructive" className="text-xs">
                                  Expired
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className={isExpired(user.expiresAt) ? "text-red-600" : ""}>
                                {formatDate(user.expiresAt)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {getDaysRemaining(user.expiresAt) > 0 
                                  ? `${getDaysRemaining(user.expiresAt)} days left`
                                  : "Expired"
                                }
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center">
                                      <Users className="h-5 w-5 mr-2" />
                                      User Details: {user.username}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-6">
                                    {/* Basic Information */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Basic Information</h4>
                                          <div className="space-y-2">
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Username:</span>
                                              <span className="text-sm font-mono">{user.username}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Email:</span>
                                              <span className="text-sm">{user.email || "Not provided"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Status:</span>
                                              <Badge 
                                                variant={user.isActive ? "default" : "secondary"}
                                                className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                              >
                                                {user.isActive ? "Active" : "Suspended"}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                                            <Network className="h-4 w-4 mr-1" />
                                            Network Configuration
                                          </h4>
                                          <div className="space-y-2">
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">IP Address:</span>
                                              <span className="text-sm font-mono">{user.ipAddress}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Port:</span>
                                              <span className="text-sm font-mono">{user.port}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                                            <Database className="h-4 w-4 mr-1" />
                                            Data Usage
                                          </h4>
                                          <div className="space-y-2">
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Data Limit:</span>
                                              <span className="text-sm">{formatBytes(user.dataLimit)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Data Used:</span>
                                              <span className="text-sm">{formatBytes(user.dataUsed || 0)}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                              <div 
                                                className="bg-blue-600 h-2 rounded-full" 
                                                style={{ 
                                                  width: `${Math.min((user.dataUsed || 0) / user.dataLimit * 100, 100)}%` 
                                                }}
                                              ></div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {((user.dataUsed || 0) / user.dataLimit * 100).toFixed(1)}% used
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                                            <Calendar className="h-4 w-4 mr-1" />
                                            Time Information
                                          </h4>
                                          <div className="space-y-2">
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Created:</span>
                                              <span className="text-sm">{formatDate(user.createdAt)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Expires:</span>
                                              <span className={`text-sm ${isExpired(user.expiresAt) ? "text-red-600" : ""}`}>
                                                {formatDate(user.expiresAt)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Days Valid:</span>
                                              <span className="text-sm">{user.daysValid} days</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-sm text-gray-600">Last Connection:</span>
                                              <span className="text-sm">
                                                {user.lastConnection ? formatDate(user.lastConnection) : "Never"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => suspendUserMutation.mutate({ 
                                  userId: user.id, 
                                  isActive: !user.isActive 
                                })}
                                disabled={suspendUserMutation.isPending}
                                className={user.isActive ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}
                              >
                                {user.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                disabled={deleteUserMutation.isPending}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}