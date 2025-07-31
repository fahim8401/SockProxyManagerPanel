import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Server, 
  Bell, 
  Database, 
  Network,
  Key,
  AlertTriangle,
  Save,
  RefreshCw
} from "lucide-react";
import Sidebar from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  
  // Server Settings
  const [serverPort, setServerPort] = useState("1080");
  const [maxConnections, setMaxConnections] = useState("1000");
  const [connectionTimeout, setConnectionTimeout] = useState("300");
  const [enableLogging, setEnableLogging] = useState(true);
  
  // Security Settings
  const [enableRateLimit, setEnableRateLimit] = useState(true);
  const [rateLimitRequests, setRateLimitRequests] = useState("100");
  const [rateLimitWindow, setRateLimitWindow] = useState("60");
  const [enableGeoBlocking, setEnableGeoBlocking] = useState(false);
  const [blockedCountries, setBlockedCountries] = useState("");
  const [enableFailBan, setEnableFailBan] = useState(true);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState("5");
  
  // Notification Settings
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(true);
  const [enableSmsAlerts, setEnableSmsAlerts] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({
    highCpuUsage: "80",
    lowDiskSpace: "10",
    maxConnections: "900"
  });
  
  // Database Settings
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [retentionDays, setRetentionDays] = useState("30");

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      // In a real app, this would save to backend
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const restartServerMutation = useMutation({
    mutationFn: async () => {
      // In a real app, this would restart the SOCKS5 server
      return new Promise(resolve => setTimeout(resolve, 2000));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Server restarted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restart server",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    const settings = {
      server: {
        port: serverPort,
        maxConnections,
        connectionTimeout,
        enableLogging
      },
      security: {
        enableRateLimit,
        rateLimitRequests,
        rateLimitWindow,
        enableGeoBlocking,
        blockedCountries: blockedCountries.split(',').map(c => c.trim()),
        enableFailBan,
        maxFailedAttempts
      },
      notifications: {
        enableEmailNotifications,
        enableSmsAlerts,
        alertThresholds
      },
      database: {
        backupFrequency,
        retentionDays
      }
    };
    
    saveSettingsMutation.mutate(settings);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
              <p className="text-sm text-gray-600">Configure your SOCKS5 proxy server</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => restartServerMutation.mutate()}
                disabled={restartServerMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${restartServerMutation.isPending ? 'animate-spin' : ''}`} />
                Restart Server
              </Button>
              <Button 
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="server" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="server" className="flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>Server</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Database</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="server">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="w-5 h-5" />
                    <span>Server Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="server-port">Server Port</Label>
                      <Input
                        id="server-port"
                        type="number"
                        value={serverPort}
                        onChange={(e) => setServerPort(e.target.value)}
                        placeholder="1080"
                      />
                      <p className="text-sm text-gray-500">Port for SOCKS5 proxy server</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max-connections">Max Connections</Label>
                      <Input
                        id="max-connections"
                        type="number"
                        value={maxConnections}
                        onChange={(e) => setMaxConnections(e.target.value)}
                        placeholder="1000"
                      />
                      <p className="text-sm text-gray-500">Maximum concurrent connections</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="connection-timeout">Connection Timeout (seconds)</Label>
                      <Input
                        id="connection-timeout"
                        type="number"
                        value={connectionTimeout}
                        onChange={(e) => setConnectionTimeout(e.target.value)}
                        placeholder="300"
                      />
                      <p className="text-sm text-gray-500">Idle connection timeout</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-logging"
                        checked={enableLogging}
                        onCheckedChange={setEnableLogging}
                      />
                      <Label htmlFor="enable-logging">Enable Detailed Logging</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Rate Limiting</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-rate-limit"
                        checked={enableRateLimit}
                        onCheckedChange={setEnableRateLimit}
                      />
                      <Label htmlFor="enable-rate-limit">Enable Rate Limiting</Label>
                    </div>
                    
                    {enableRateLimit && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="rate-limit-requests">Requests per Window</Label>
                          <Input
                            id="rate-limit-requests"
                            type="number"
                            value={rateLimitRequests}
                            onChange={(e) => setRateLimitRequests(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rate-limit-window">Window (seconds)</Label>
                          <Input
                            id="rate-limit-window"
                            type="number"
                            value={rateLimitWindow}
                            onChange={(e) => setRateLimitWindow(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Network className="w-5 h-5" />
                      <span>Geographic Blocking</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-geo-blocking"
                        checked={enableGeoBlocking}
                        onCheckedChange={setEnableGeoBlocking}
                      />
                      <Label htmlFor="enable-geo-blocking">Enable Geographic Blocking</Label>
                    </div>
                    
                    {enableGeoBlocking && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="blocked-countries">Blocked Countries (comma-separated)</Label>
                        <Textarea
                          id="blocked-countries"
                          value={blockedCountries}
                          onChange={(e) => setBlockedCountries(e.target.value)}
                          placeholder="CN, RU, KP"
                          rows={3}
                        />
                        <p className="text-sm text-gray-500">Use ISO country codes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="w-5 h-5" />
                      <span>Authentication Security</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-fail-ban"
                        checked={enableFailBan}
                        onCheckedChange={setEnableFailBan}
                      />
                      <Label htmlFor="enable-fail-ban">Enable Fail2Ban Protection</Label>
                    </div>
                    
                    {enableFailBan && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="max-failed-attempts">Max Failed Attempts</Label>
                        <Input
                          id="max-failed-attempts"
                          type="number"
                          value={maxFailedAttempts}
                          onChange={(e) => setMaxFailedAttempts(e.target.value)}
                          className="w-32"
                        />
                        <p className="text-sm text-gray-500">IP will be banned after this many failed attempts</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="w-5 h-5" />
                    <span>Alert Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-email-notifications"
                        checked={enableEmailNotifications}
                        onCheckedChange={setEnableEmailNotifications}
                      />
                      <Label htmlFor="enable-email-notifications">Email Notifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-sms-alerts"
                        checked={enableSmsAlerts}
                        onCheckedChange={setEnableSmsAlerts}
                      />
                      <Label htmlFor="enable-sms-alerts">SMS Alerts</Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Alert Thresholds</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cpu-threshold">High CPU Usage (%)</Label>
                        <Input
                          id="cpu-threshold"
                          type="number"
                          value={alertThresholds.highCpuUsage}
                          onChange={(e) => setAlertThresholds(prev => ({
                            ...prev,
                            highCpuUsage: e.target.value
                          }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="disk-threshold">Low Disk Space (%)</Label>
                        <Input
                          id="disk-threshold"
                          type="number"
                          value={alertThresholds.lowDiskSpace}
                          onChange={(e) => setAlertThresholds(prev => ({
                            ...prev,
                            lowDiskSpace: e.target.value
                          }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="connections-threshold">Max Connections</Label>
                        <Input
                          id="connections-threshold"
                          type="number"
                          value={alertThresholds.maxConnections}
                          onChange={(e) => setAlertThresholds(prev => ({
                            ...prev,
                            maxConnections: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="database">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Database Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="backup-frequency">Backup Frequency</Label>
                      <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                        <SelectTrigger id="backup-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="retention-days">Retention Period (days)</Label>
                      <Input
                        id="retention-days"
                        type="number"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Database Security</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Regular backups are automatically encrypted and stored securely. 
                        Database credentials are rotated monthly for enhanced security.
                      </p>
                    </div>
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