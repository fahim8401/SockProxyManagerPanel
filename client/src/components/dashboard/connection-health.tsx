import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";

interface HealthData {
  status: "healthy" | "unhealthy";
  timestamp: string;
  connections: {
    active: number;
    details: Array<{
      id: string;
      userId: string;
      ipAddress: string;
      duration: number;
      bytesTransferred: number;
    }>;
  };
  users: {
    total: number;
    active: number;
    expiringSoon: number;
  };
  ipPool: {
    total: number;
    available: number;
    assigned: number;
  };
  server: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    nodeVersion: string;
  };
}

export default function ConnectionHealth() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data: healthData, isLoading, refetch } = useQuery<HealthData>({
    queryKey: ["/api/health"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    if (healthData) {
      setLastUpdated(new Date());
    }
  }, [healthData]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getHealthStatus = () => {
    if (!healthData) return { icon: WifiOff, color: "text-gray-500", text: "Loading..." };
    
    if (healthData.status === "unhealthy") {
      return { icon: AlertTriangle, color: "text-red-500", text: "Unhealthy" };
    }

    const hasActiveConnections = healthData.connections.active > 0;
    const hasAvailableIPs = healthData.ipPool.available > 0;
    
    if (hasActiveConnections && hasAvailableIPs) {
      return { icon: CheckCircle, color: "text-green-500", text: "Excellent" };
    } else if (hasAvailableIPs) {
      return { icon: Wifi, color: "text-yellow-500", text: "Ready" };
    } else {
      return { icon: AlertTriangle, color: "text-orange-500", text: "Warning" };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Connection Health</CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Live
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Health Status */}
          <div className="flex items-center space-x-2">
            <HealthIcon className={`h-5 w-5 ${healthStatus.color}`} />
            <span className={`font-medium ${healthStatus.color}`}>
              {healthStatus.text}
            </span>
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </div>

          {healthData && (
            <>
              {/* Real-time Connection Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Active Connections</div>
                  <div className="font-medium text-lg">
                    {healthData.connections.active}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Available IPs</div>
                  <div className="font-medium text-lg">
                    {healthData.ipPool.available}
                  </div>
                </div>
              </div>

              {/* Active Connections List */}
              {healthData.connections.details.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Active Connections:
                  </div>
                  <div className="space-y-1">
                    {healthData.connections.details.slice(0, 3).map((conn) => (
                      <div key={conn.id} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                        <span className="font-mono">{conn.ipAddress}</span>
                        <span className="text-gray-500">
                          {formatUptime(conn.duration)}
                        </span>
                      </div>
                    ))}
                    {healthData.connections.details.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{healthData.connections.details.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* System Stats */}
              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Uptime:</span>
                    <span className="ml-1 font-medium">
                      {formatUptime(healthData.server.uptime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory:</span>
                    <span className="ml-1 font-medium">
                      {formatBytes(healthData.server.memory.heapUsed)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {healthData.users.expiringSoon > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-800">
                      {healthData.users.expiringSoon} user(s) expiring soon
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}