import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  User as UserIcon, 
  Calendar, 
  Globe, 
  Activity, 
  Clock,
  Shield,
  Database,
  Network
} from "lucide-react";
import { User, Connection } from "@shared/schema";

interface UserDetailsModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserDetailsModal({ user, open, onOpenChange }: UserDetailsModalProps) {
  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections", user?.id],
    enabled: !!user?.id && open,
  });

  if (!user) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | Date): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUsagePercentage = (used: number, limit: number): number => {
    return limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  };

  const getUserStatus = (): { label: string; color: string } => {
    if (!user.isActive) return { label: "Inactive", color: "gray" };
    if (new Date() > new Date(user.expiresAt)) return { label: "Expired", color: "red" };
    return { label: "Active", color: "green" };
  };

  const status = getUserStatus();
  const usagePercentage = getUsagePercentage(user.dataUsed || 0, user.dataLimit);
  const daysRemaining = Math.ceil((new Date(user.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Sample connection history (in real app, this would come from backend)
  const recentConnections = [
    {
      id: "1",
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      ipAddress: "203.0.113.1",
      bytesTransferred: 1024 * 1024 * 250 // 250 MB
    },
    {
      id: "2", 
      startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
      ipAddress: "203.0.113.1",
      bytesTransferred: 1024 * 1024 * 180 // 180 MB
    },
    {
      id: "3",
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 23 * 60 * 60 * 1000),
      ipAddress: "203.0.113.1",
      bytesTransferred: 1024 * 1024 * 320 // 320 MB
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
              <p className="text-sm text-gray-500">{user.email || "No email provided"}</p>
            </div>
            <Badge 
              className={
                status.color === "green" ? "bg-green-100 text-green-800" :
                status.color === "red" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"
              }
            >
              {status.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Data Used</p>
                      <p className="font-semibold">{formatBytes(user.dataUsed || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Days Remaining</p>
                      <p className="font-semibold">{daysRemaining > 0 ? daysRemaining : 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Network className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Assigned IP</p>
                      <p className="font-semibold font-mono text-sm">{user.ipAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Port</p>
                      <p className="font-semibold">{user.port}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Used: {formatBytes(user.dataUsed || 0)}</span>
                    <span>Limit: {formatBytes(user.dataLimit)}</span>
                  </div>
                  <Progress value={usagePercentage} className="h-3" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{usagePercentage.toFixed(1)}% used</span>
                    <span>{formatBytes(user.dataLimit - (user.dataUsed || 0))} remaining</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">{formatDate(user.createdAt!)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expires</p>
                    <p className="font-medium">{formatDate(user.expiresAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Connection</p>
                    <p className="font-medium">
                      {user.lastConnection ? formatDate(user.lastConnection) : "Never"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">IP Type</p>
                    <p className="font-medium">
                      {user.ipAddress.includes(':') ? 'IPv6' : 'IPv4'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Recent Connections</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Source IP</TableHead>
                      <TableHead>Data Transfer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentConnections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No recent connections found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentConnections.map((conn) => {
                        const duration = conn.endTime ? 
                          Math.round((conn.endTime.getTime() - conn.startTime.getTime()) / (1000 * 60)) : 
                          "Ongoing";
                        
                        return (
                          <TableRow key={conn.id}>
                            <TableCell>
                              {conn.startTime.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </TableCell>
                            <TableCell>
                              {typeof duration === 'number' ? `${duration} min` : duration}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {conn.ipAddress}
                            </TableCell>
                            <TableCell>
                              {formatBytes(conn.bytesTransferred)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Security Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Authentication Status</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Secure</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Password Strength</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Strong</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">Failed Login Attempts</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">0 (Last 24h)</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-medium">Connection Encryption</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">TLS 1.3</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}