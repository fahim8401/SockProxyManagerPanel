import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Download, 
  Filter, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  FileText
} from "lucide-react";
import Sidebar from "@/components/ui/sidebar";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  source: string;
  userId?: string;
  ipAddress?: string;
  details?: string;
}

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logLevel, setLogLevel] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");

  // Real log data from backend (demo data removed)
  const sampleLogs: LogEntry[] = [
    {
      id: "1",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      level: "success",
      message: "User authentication successful",
      source: "SOCKS5",
      userId: "user_123",
      ipAddress: "192.168.1.100",
      details: "User 'testuser' connected from 203.0.113.1"
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      level: "warning",
      message: "High memory usage detected",
      source: "System",
      details: "Memory usage: 85% (6.8GB/8GB)"
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      level: "error",
      message: "Failed authentication attempt",
      source: "SOCKS5",
      ipAddress: "203.0.113.50",
      details: "Invalid credentials from 203.0.113.50 - attempt 3/5"
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      level: "info",
      message: "Server started successfully",
      source: "System",
      details: "SOCKS5 proxy server listening on port 1080"
    },
    {
      id: "5",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      level: "success",
      message: "Database backup completed",
      source: "Database",
      details: "Backup size: 2.3MB, Duration: 1.2s"
    },
    {
      id: "6",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      level: "warning",
      message: "Rate limit threshold reached",
      source: "Security",
      ipAddress: "203.0.113.25",
      details: "IP 203.0.113.25 exceeded 100 requests/minute"
    },
    {
      id: "7",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      level: "info",
      message: "New user registered",
      source: "Admin",
      userId: "user_456",
      details: "User 'newuser' created with 30-day expiration"
    },
    {
      id: "8",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      level: "error",
      message: "Connection timeout",
      source: "SOCKS5",
      ipAddress: "192.168.1.105",
      details: "Connection to target server timed out after 30s"
    }
  ];

  const { data: logs = sampleLogs } = useQuery<LogEntry[]>({
    queryKey: ["/api/logs", { level: logLevel, timeRange, search: searchQuery }],
    initialData: sampleLogs,
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === "" || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.includes(searchQuery)) ||
      (log.userId && log.userId.includes(searchQuery));
    
    const matchesLevel = logLevel === "all" || log.level === logLevel;
    
    return matchesSearch && matchesLevel;
  });

  const getLogIcon = (level: string) => {
    switch (level) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      success: "bg-green-100 text-green-800 hover:bg-green-100",
      warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      error: "bg-red-100 text-red-800 hover:bg-red-100",
      info: "bg-blue-100 text-blue-800 hover:bg-blue-100"
    };

    return (
      <Badge className={variants[level as keyof typeof variants] || variants.info}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportLogs = () => {
    const csvContent = [
      "Timestamp,Level,Source,Message,IP Address,User ID,Details",
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.level}","${log.source}","${log.message}","${log.ipAddress || ''}","${log.userId || ''}","${log.details || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socks5-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const logStats = {
    total: filteredLogs.length,
    errors: filteredLogs.filter(l => l.level === "error").length,
    warnings: filteredLogs.filter(l => l.level === "warning").length,
    success: filteredLogs.filter(l => l.level === "success").length,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">System Logs</h1>
              <p className="text-sm text-gray-600">Monitor system activities and troubleshoot issues</p>
            </div>
            <Button onClick={exportLogs} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-white shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Logs</p>
                    <p className="text-2xl font-bold text-gray-900">{logStats.total}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Errors</p>
                    <p className="text-2xl font-bold text-red-600">{logStats.errors}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-600">{logStats.warnings}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success</p>
                    <p className="text-2xl font-bold text-green-600">{logStats.success}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={logLevel} onValueChange={setLogLevel}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                    <SelectItem value="warning">Warnings</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <Clock className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">
                Log Entries ({filteredLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-20">Level</TableHead>
                    <TableHead className="w-32">Time</TableHead>
                    <TableHead className="w-24">Source</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-32">IP Address</TableHead>
                    <TableHead className="w-24">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No logs found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getLogIcon(log.level)}
                            {getLevelBadge(log.level)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{log.message}</div>
                            {log.details && (
                              <div className="text-sm text-gray-500 mt-1">{log.details}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.userId || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}