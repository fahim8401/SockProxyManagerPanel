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
  RefreshCw,
  Route,
  Globe
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

  // Firewall Settings
  const [enableFirewall, setEnableFirewall] = useState(true);
  const [allowedPorts, setAllowedPorts] = useState("22,80,443,1080,5000");
  const [blockedIPs, setBlockedIPs] = useState("");
  const [firewallRules, setFirewallRules] = useState("");
  const [enableDDoSProtection, setEnableDDoSProtection] = useState(true);

  // Routing Settings  
  const [enableCustomRouting, setEnableCustomRouting] = useState(false);
  const [routingTable, setRoutingTable] = useState("");
  const [enableTrafficShaping, setEnableTrafficShaping] = useState(false);
  const [bandwidthLimit, setBandwidthLimit] = useState("1000");
  const [routingProtocol, setRoutingProtocol] = useState("static");

  // DNS Settings
  const [primaryDNS, setPrimaryDNS] = useState("8.8.8.8");
  const [secondaryDNS, setSecondaryDNS] = useState("8.8.4.4");
  const [enableDNSFiltering, setEnableDNSFiltering] = useState(false);

  // Regional & Time Settings
  const [timezone, setTimezone] = useState("America/New_York");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timeFormat, setTimeFormat] = useState("12");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [region, setRegion] = useState("US");
  const [blockedDomains, setBlockedDomains] = useState("");
  const [enableDNSCache, setEnableDNSCache] = useState(true);
  const [dnsCacheTTL, setDnsCacheTTL] = useState("3600");

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
      },
      firewall: {
        enableFirewall,
        allowedPorts: allowedPorts.split(',').map(p => p.trim()),
        blockedIPs: blockedIPs.split(',').map(ip => ip.trim()).filter(ip => ip),
        firewallRules,
        enableDDoSProtection
      },
      routing: {
        enableCustomRouting,
        routingTable,
        enableTrafficShaping,
        bandwidthLimit,
        routingProtocol
      },
      dns: {
        primaryDNS,
        secondaryDNS,
        enableDNSFiltering,
        blockedDomains: blockedDomains.split(',').map(d => d.trim()).filter(d => d),
        enableDNSCache,
        dnsCacheTTL
      },
      regional: {
        timezone,
        dateFormat,
        timeFormat,
        language,
        currency,
        region
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
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="server" className="flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>Server</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </TabsTrigger>
              <TabsTrigger value="firewall" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Firewall</span>
              </TabsTrigger>
              <TabsTrigger value="routing" className="flex items-center space-x-2">
                <Route className="w-4 h-4" />
                <span>Routing</span>
              </TabsTrigger>
              <TabsTrigger value="dns" className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>DNS</span>
              </TabsTrigger>
              <TabsTrigger value="regional" className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Regional</span>
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

            <TabsContent value="firewall">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Firewall Configuration</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-firewall"
                        checked={enableFirewall}
                        onCheckedChange={setEnableFirewall}
                      />
                      <Label htmlFor="enable-firewall">Enable Firewall</Label>
                    </div>

                    {enableFirewall && (
                      <div className="space-y-6 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="allowed-ports">Allowed Ports (comma-separated)</Label>
                          <Input
                            id="allowed-ports"
                            value={allowedPorts}
                            onChange={(e) => setAllowedPorts(e.target.value)}
                            placeholder="22,80,443,1080,5000"
                          />
                          <p className="text-sm text-gray-500">List of ports that should be accessible</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="blocked-ips">Blocked IPs (comma-separated)</Label>
                          <Input
                            id="blocked-ips"
                            value={blockedIPs}
                            onChange={(e) => setBlockedIPs(e.target.value)}
                            placeholder="192.168.1.100,10.0.0.50"
                          />
                          <p className="text-sm text-gray-500">IP addresses to block from accessing the server</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="firewall-rules">Custom Firewall Rules</Label>
                          <Textarea
                            id="firewall-rules"
                            value={firewallRules}
                            onChange={(e) => setFirewallRules(e.target.value)}
                            placeholder="Enter custom iptables rules (one per line)"
                            rows={6}
                          />
                          <p className="text-sm text-gray-500">Advanced firewall rules using iptables syntax</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enable-ddos-protection"
                            checked={enableDDoSProtection}
                            onCheckedChange={setEnableDDoSProtection}
                          />
                          <Label htmlFor="enable-ddos-protection">Enable DDoS Protection</Label>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="routing">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Route className="w-5 h-5" />
                      <span>Network Routing</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-custom-routing"
                        checked={enableCustomRouting}
                        onCheckedChange={setEnableCustomRouting}
                      />
                      <Label htmlFor="enable-custom-routing">Enable Custom Routing</Label>
                    </div>

                    {enableCustomRouting && (
                      <div className="space-y-6 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="routing-protocol">Routing Protocol</Label>
                          <Select value={routingProtocol} onValueChange={setRoutingProtocol}>
                            <SelectTrigger id="routing-protocol">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="static">Static Routing</SelectItem>
                              <SelectItem value="dynamic">Dynamic Routing</SelectItem>
                              <SelectItem value="bgp">BGP</SelectItem>
                              <SelectItem value="ospf">OSPF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="routing-table">Routing Table</Label>
                          <Textarea
                            id="routing-table"
                            value={routingTable}
                            onChange={(e) => setRoutingTable(e.target.value)}
                            placeholder="192.168.1.0/24 via 10.0.0.1 dev eth0&#10;0.0.0.0/0 via 192.168.1.1 dev eth0"
                            rows={8}
                          />
                          <p className="text-sm text-gray-500">Define custom routing rules (CIDR format)</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-traffic-shaping"
                        checked={enableTrafficShaping}
                        onCheckedChange={setEnableTrafficShaping}
                      />
                      <Label htmlFor="enable-traffic-shaping">Enable Traffic Shaping</Label>
                    </div>

                    {enableTrafficShaping && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="bandwidth-limit">Bandwidth Limit (Mbps)</Label>
                        <Input
                          id="bandwidth-limit"
                          type="number"
                          value={bandwidthLimit}
                          onChange={(e) => setBandwidthLimit(e.target.value)}
                          placeholder="1000"
                        />
                        <p className="text-sm text-gray-500">Maximum bandwidth per connection</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="dns">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="w-5 h-5" />
                      <span>DNS Configuration</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="primary-dns">Primary DNS Server</Label>
                        <Input
                          id="primary-dns"
                          value={primaryDNS}
                          onChange={(e) => setPrimaryDNS(e.target.value)}
                          placeholder="8.8.8.8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondary-dns">Secondary DNS Server</Label>
                        <Input
                          id="secondary-dns"
                          value={secondaryDNS}
                          onChange={(e) => setSecondaryDNS(e.target.value)}
                          placeholder="8.8.4.4"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-dns-cache"
                        checked={enableDNSCache}
                        onCheckedChange={setEnableDNSCache}
                      />
                      <Label htmlFor="enable-dns-cache">Enable DNS Caching</Label>
                    </div>

                    {enableDNSCache && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="dns-cache-ttl">Cache TTL (seconds)</Label>
                        <Input
                          id="dns-cache-ttl"
                          type="number"
                          value={dnsCacheTTL}
                          onChange={(e) => setDnsCacheTTL(e.target.value)}
                          placeholder="3600"
                        />
                        <p className="text-sm text-gray-500">How long to cache DNS responses</p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-dns-filtering"
                        checked={enableDNSFiltering}
                        onCheckedChange={setEnableDNSFiltering}
                      />
                      <Label htmlFor="enable-dns-filtering">Enable DNS Filtering</Label>
                    </div>

                    {enableDNSFiltering && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="blocked-domains">Blocked Domains (comma-separated)</Label>
                        <Textarea
                          id="blocked-domains"
                          value={blockedDomains}
                          onChange={(e) => setBlockedDomains(e.target.value)}
                          placeholder="malware.com,phishing.net,adserver.org"
                          rows={4}
                        />
                        <p className="text-sm text-gray-500">Domains to block DNS resolution for</p>
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

            <TabsContent value="regional">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <span>Regional & Time Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger id="timezone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (UTC-5)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (UTC-6)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (UTC-7)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (UTC-8)</SelectItem>
                          <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                          <SelectItem value="Europe/Berlin">Berlin (UTC+1)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (UTC+9)</SelectItem>
                          <SelectItem value="Asia/Shanghai">Shanghai (UTC+8)</SelectItem>
                          <SelectItem value="Asia/Mumbai">Mumbai (UTC+5:30)</SelectItem>
                          <SelectItem value="Australia/Sydney">Sydney (UTC+10)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">Set your local timezone for accurate timestamps</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date-format">Date Format</Label>
                      <Select value={dateFormat} onValueChange={setDateFormat}>
                        <SelectTrigger id="date-format">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK)</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                          <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (German)</SelectItem>
                          <SelectItem value="DD/MM/YY">DD/MM/YY (Short)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">Choose your preferred date display format</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="time-format">Time Format</Label>
                      <Select value={timeFormat} onValueChange={setTimeFormat}>
                        <SelectTrigger id="time-format">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                          <SelectItem value="24">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">Choose between 12-hour and 24-hour time display</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="pt">Português</SelectItem>
                          <SelectItem value="it">Italiano</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">Set your preferred interface language</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="JPY">JPY (¥)</SelectItem>
                          <SelectItem value="CNY">CNY (¥)</SelectItem>
                          <SelectItem value="CAD">CAD ($)</SelectItem>
                          <SelectItem value="AUD">AUD ($)</SelectItem>
                          <SelectItem value="CHF">CHF (Fr)</SelectItem>
                          <SelectItem value="KRW">KRW (₩)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">Currency for pricing and billing displays</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Select value={region} onValueChange={setRegion}>
                        <SelectTrigger id="region">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                          <SelectItem value="CN">China</SelectItem>
                          <SelectItem value="KR">South Korea</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                          <SelectItem value="BR">Brazil</SelectItem>
                          <SelectItem value="RU">Russia</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">Your geographical region for localization</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                    <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Regional Settings</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        These settings affect how dates, times, and numbers are displayed throughout the system. 
                        Changes will apply to all new data displays and reports.
                      </p>
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