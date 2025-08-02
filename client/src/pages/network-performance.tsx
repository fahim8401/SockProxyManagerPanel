import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Wifi, 
  Server, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Users,
  BarChart3,
  Network,
  Zap,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface NetworkMetrics {
  timestamp: number;
  bandwidth: {
    download: number;
    upload: number;
  };
  latency: {
    ping: number;
    jitter: number;
  };
  throughput: {
    total: number;
    per_user: number;
  };
  connections: {
    active: number;
    total: number;
    success_rate: number;
  };
  server_load: {
    cpu: number;
    memory: number;
    disk: number;
  };
  network_quality: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

interface UserTraffic {
  username: string;
  bytesUp: number;
  bytesDown: number;
  connections: number;
  avgLatency: number;
  status: 'online' | 'offline';
}

interface GeographicData {
  country: string;
  region: string;
  connections: number;
  bandwidth: number;
  avgLatency: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function NetworkPerformanceDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedMetric, setSelectedMetric] = useState('bandwidth');
  const [currentMetrics, setCurrentMetrics] = useState<NetworkMetrics | null>(null);

  // Real-time network metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/network/metrics', timeRange],
    refetchInterval: autoRefresh ? 2000 : false,
    refetchIntervalInBackground: true,
  });

  // User traffic data
  const { data: trafficData, isLoading: trafficLoading } = useQuery({
    queryKey: ['/api/network/traffic'],
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Geographic distribution
  const { data: geoData, isLoading: geoLoading } = useQuery({
    queryKey: ['/api/network/geographic'],
    refetchInterval: autoRefresh ? 10000 : false,
  });

  // Connection quality over time
  const { data: qualityData, isLoading: qualityLoading } = useQuery({
    queryKey: ['/api/network/quality', timeRange],
    refetchInterval: autoRefresh ? 3000 : false,
  });

  useEffect(() => {
    if (metricsData && metricsData.length > 0) {
      setCurrentMetrics(metricsData[metricsData.length - 1]);
    }
  }, [metricsData]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLatency = (ms: number): string => {
    return `${ms.toFixed(1)} ms`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'fair': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'poor': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (metricsLoading || !currentMetrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading network performance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Network Performance Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring and analytics</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh">Auto Refresh</Label>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Network Quality</p>
                <div className="flex items-center mt-2">
                  {getStatusIcon(currentMetrics.network_quality.status)}
                  <span className={`ml-2 text-lg font-bold ${getStatusColor(currentMetrics.network_quality.status)}`}>
                    {currentMetrics.network_quality.score}/100
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  {currentMetrics.network_quality.status}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <div className="flex items-center mt-2">
                  <span className="text-2xl font-bold">{currentMetrics.connections.active}</span>
                  <Badge variant="secondary" className="ml-2">
                    {currentMetrics.connections.success_rate.toFixed(1)}% success
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {currentMetrics.connections.total} total
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bandwidth</p>
                <div className="mt-2">
                  <div className="flex items-center">
                    <TrendingDown className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm font-medium">
                      {formatBytes(currentMetrics.bandwidth.download)}/s
                    </span>
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-sm font-medium">
                      {formatBytes(currentMetrics.bandwidth.upload)}/s
                    </span>
                  </div>
                </div>
              </div>
              <Wifi className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Latency</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{formatLatency(currentMetrics.latency.ping)}</span>
                  <p className="text-xs text-gray-500 mt-1">
                    Jitter: {formatLatency(currentMetrics.latency.jitter)}
                  </p>
                </div>
              </div>
              <Clock className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="users">User Traffic</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="server">Server Health</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bandwidth Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Bandwidth Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metricsData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value * 1000).toLocaleTimeString()}
                    />
                    <YAxis tickFormatter={(value) => formatBytes(value)} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value * 1000).toLocaleString()}
                      formatter={(value: any) => [formatBytes(value), '']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="bandwidth.download"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Download"
                    />
                    <Area
                      type="monotone"
                      dataKey="bandwidth.upload"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      name="Upload"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Connection Success Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Network className="h-5 w-5 mr-2" />
                  Connection Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={qualityData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value * 1000).toLocaleTimeString()}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value * 1000).toLocaleString()}
                      formatter={(value: any) => [`${value}%`, '']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="success_rate"
                      stroke="#00C49F"
                      strokeWidth={2}
                      name="Success Rate"
                    />
                    <Line
                      type="monotone"
                      dataKey="quality_score"
                      stroke="#FF8042"
                      strokeWidth={2}
                      name="Quality Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Latency Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value * 1000).toLocaleTimeString()}
                    />
                    <YAxis tickFormatter={(value) => `${value}ms`} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value * 1000).toLocaleString()}
                      formatter={(value: any) => [`${value}ms`, '']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="latency.ping"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Ping"
                    />
                    <Line
                      type="monotone"
                      dataKey="latency.jitter"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Jitter"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Throughput Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Throughput Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData?.slice(-20) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value * 1000).toLocaleTimeString()}
                    />
                    <YAxis tickFormatter={(value) => formatBytes(value)} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value * 1000).toLocaleString()}
                      formatter={(value: any) => [formatBytes(value), '']}
                    />
                    <Legend />
                    <Bar
                      dataKey="throughput.total"
                      fill="#8884d8"
                      name="Total Throughput"
                    />
                    <Bar
                      dataKey="throughput.per_user"
                      fill="#82ca9d"
                      name="Per User Average"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Traffic Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Traffic Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trafficLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading user data...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">User</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-right p-2">Upload</th>
                          <th className="text-right p-2">Download</th>
                          <th className="text-right p-2">Connections</th>
                          <th className="text-right p-2">Avg Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(trafficData || []).map((user: UserTraffic, index: number) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{user.username}</td>
                            <td className="p-2">
                              <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                                {user.status}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">{formatBytes(user.bytesUp)}</td>
                            <td className="p-2 text-right">{formatBytes(user.bytesDown)}</td>
                            <td className="p-2 text-right">{user.connections}</td>
                            <td className="p-2 text-right">{formatLatency(user.avgLatency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={geoData || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ country, percentage }) => `${country} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="connections"
                    >
                      {(geoData || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {geoLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    (geoData || []).map((region: GeographicData, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{region.country}</p>
                          <p className="text-sm text-gray-600">{region.region}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{region.connections} connections</p>
                          <p className="text-xs text-gray-500">{formatLatency(region.avgLatency)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Server Health Tab */}
        <TabsContent value="server" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Current</span>
                    <span className="font-medium">{currentMetrics.server_load.cpu.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentMetrics.server_load.cpu} className="w-full" />
                  <p className="text-xs text-gray-500">
                    {currentMetrics.server_load.cpu > 80 ? 'High load detected' : 'Normal operation'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Current</span>
                    <span className="font-medium">{currentMetrics.server_load.memory.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentMetrics.server_load.memory} className="w-full" />
                  <p className="text-xs text-gray-500">
                    {currentMetrics.server_load.memory > 85 ? 'Memory pressure detected' : 'Normal operation'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Disk Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Current</span>
                    <span className="font-medium">{currentMetrics.server_load.disk.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentMetrics.server_load.disk} className="w-full" />
                  <p className="text-xs text-gray-500">
                    {currentMetrics.server_load.disk > 90 ? 'Low disk space' : 'Normal operation'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Server Performance Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Server Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value * 1000).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value * 1000).toLocaleString()}
                    formatter={(value: any) => [`${value}%`, '']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="server_load.cpu"
                    stroke="#FF6B6B"
                    strokeWidth={2}
                    name="CPU"
                  />
                  <Line
                    type="monotone"
                    dataKey="server_load.memory"
                    stroke="#4ECDC4"
                    strokeWidth={2}
                    name="Memory"
                  />
                  <Line
                    type="monotone"
                    dataKey="server_load.disk"
                    stroke="#45B7D1"
                    strokeWidth={2}
                    name="Disk"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}