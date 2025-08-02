import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/ui/sidebar";
import MobileSidebar from "@/components/ui/mobile-sidebar";
import StatsCards from "../components/dashboard/stats-cards";
import UserTable from "../components/dashboard/user-table";
import CreateUserModal from "../components/dashboard/create-user-modal";
import RealtimeChart from "../components/dashboard/real-time-chart";
import SystemStatus from "../components/dashboard/system-status";
import ConnectionHealth from "../components/dashboard/connection-health";
import { StatsCardSkeleton, TableSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { User } from "@shared/schema";
import { Bell, UserCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  totalUsers: number;
  activeConnections: number;
  dataTransferred: number;
  availableIPs: number;
}

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [realtimeStats, setRealtimeStats] = useState<Stats | null>(null);
  const [connectionData, setConnectionData] = useState<Array<{ time: string; connections: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAuth();

  const { data: users = [], refetch: refetchUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Simulate initial loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'stats') {
          setRealtimeStats(message.data);
          
          // Update connection chart data
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          setConnectionData(prev => {
            const newData = [...prev, { 
              time: timeStr, 
              connections: message.data.activeConnections 
            }];
            // Keep only last 20 data points
            return newData.slice(-20);
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, []);

  const displayStats = realtimeStats || stats || {
    totalUsers: 0,
    activeConnections: 0,
    dataTransferred: 0,
    availableIPs: 0
  };

  const formatDataTransfer = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <MobileSidebar />
      
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 animate-slideInRight">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pl-16 lg:pl-6">
            <div className="animate-fadeInUp min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 truncate">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Manage your SOCKS5 proxy server and users</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 animate-fadeInUp delay-200">
              <button className="relative p-2 text-gray-600 hover:text-gray-800 hidden sm:block">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-sm text-gray-600">Admin User</span>
                <UserCircle className="w-6 h-6 text-gray-600" />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={logout}
                className="text-red-600 hover:text-red-700 text-xs sm:text-sm"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Dashboard Stats */}
            {isLoading || statsLoading ? (
              <StatsCardSkeleton />
            ) : (
              <div className="animate-fadeInUp">
                <StatsCards 
                  stats={{
                    ...displayStats,
                    dataTransferred: formatDataTransfer(displayStats.dataTransferred)
                  }}
                />
              </div>
            )}
            
            {/* Charts and Components Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Real-time Chart */}
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <div className="animate-fadeInUp delay-200 card-hover">
                  <RealtimeChart data={connectionData} />
                </div>
              )}
              
              {/* System Status */}
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <div className="animate-fadeInUp delay-300 card-hover">
                  <SystemStatus />
                </div>
              )}

              {/* Connection Health */}
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <div className="animate-fadeInUp delay-400 card-hover">
                  <ConnectionHealth />
                </div>
              )}
            </div>
            
            {/* Recent Users Table */}
            {isLoading || usersLoading ? (
              <TableSkeleton />
            ) : (
              <div className="animate-fadeInUp delay-500">
                <UserTable 
                  users={users} 
                  onCreateUser={() => setIsCreateModalOpen(true)}
                  onRefresh={refetchUsers}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateUserModal 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onUserCreated={refetchUsers}
      />
    </div>
  );
}
