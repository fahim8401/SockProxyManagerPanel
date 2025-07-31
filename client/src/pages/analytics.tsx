import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  Download, 
  TrendingUp, 
  Users, 
  Activity, 
  Globe,
  Calendar
} from "lucide-react";
import Sidebar from "@/components/ui/sidebar";
import { User, Connection } from "@shared/schema";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  // Sample data for charts (in a real app, this would come from backend analytics)
  const dataTransferData = [
    { day: "Mon", upload: 12.4, download: 45.2 },
    { day: "Tue", upload: 19.3, download: 52.1 },
    { day: "Wed", upload: 15.7, download: 38.9 },
    { day: "Thu", upload: 22.1, download: 61.4 },
    { day: "Fri", upload: 18.5, download: 48.7 },
    { day: "Sat", upload: 25.3, download: 72.3 },
    { day: "Sun", upload: 21.8, download: 55.9 },
  ];

  const userActivityData = [
    { hour: "00:00", connections: 12 },
    { hour: "03:00", connections: 8 },
    { hour: "06:00", connections: 15 },
    { hour: "09:00", connections: 32 },
    { hour: "12:00", connections: 45 },
    { hour: "15:00", connections: 38 },
    { hour: "18:00", connections: 52 },
    { hour: "21:00", connections: 28 },
  ];

  const geoDistributionData = [
    { country: "United States", users: 45, color: "#3B82F6" },
    { country: "Germany", users: 23, color: "#10B981" },
    { country: "Japan", users: 18, color: "#F59E0B" },
    { country: "United Kingdom", users: 12, color: "#EF4444" },
    { country: "Others", users: 35, color: "#8B5CF6" },
  ];

  const protocolUsageData = [
    { protocol: "SOCKS5", percentage: 78, color: "#3B82F6" },
    { protocol: "HTTP", percentage: 15, color: "#10B981" },
    { protocol: "HTTPS", percentage: 7, color: "#F59E0B" },
  ];

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalDataTransfer = dataTransferData.reduce((sum, day) => sum + day.upload + day.download, 0);
  const averageDaily = totalDataTransfer / dataTransferData.length;
  const peakConnections = Math.max(...userActivityData.map(d => d.connections));

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Analytics</h1>
              <p className="text-sm text-gray-600">Detailed insights and performance metrics</p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                    <p className="text-xs text-green-600 mt-1">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      +12% from last week
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Users className="text-blue-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Data Transfer</p>
                    <p className="text-2xl font-bold text-gray-900">{formatBytes(totalDataTransfer * 1024 * 1024 * 1024)}</p>
                    <p className="text-xs text-green-600 mt-1">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      +8% from last week
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <Activity className="text-green-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Peak Connections</p>
                    <p className="text-2xl font-bold text-gray-900">{peakConnections}</p>
                    <p className="text-xs text-red-600 mt-1">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      During 18:00-19:00
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full">
                    <Globe className="text-purple-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Daily Usage</p>
                    <p className="text-2xl font-bold text-gray-900">{formatBytes(averageDaily * 1024 * 1024 * 1024)}</p>
                    <p className="text-xs text-green-600 mt-1">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      Consistent growth
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full">
                    <Activity className="text-orange-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Data Transfer Chart */}
            <Card className="bg-white shadow">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Data Transfer Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dataTransferData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Area 
                        type="monotone" 
                        dataKey="download" 
                        stackId="1"
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="upload" 
                        stackId="1"
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-6 mt-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-600">Download</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-600">Upload</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Activity */}
            <Card className="bg-white shadow">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Daily Connection Pattern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Bar dataKey="connections" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Geographic Distribution */}
            <Card className="bg-white shadow">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {geoDistributionData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-700">{item.country}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{item.users}</span>
                        <span className="text-xs text-gray-500">users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Protocol Usage */}
            <Card className="bg-white shadow">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Protocol Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {protocolUsageData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{item.protocol}</span>
                        <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${item.percentage}%`,
                            backgroundColor: item.color 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}