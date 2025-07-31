import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Network, Trash2, CheckCircle, XCircle } from "lucide-react";
import { IpPool, insertIpPoolSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/ui/sidebar";

export default function IpPoolPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newIpType, setNewIpType] = useState<"IPv4" | "IPv6">("IPv4");
  const { toast } = useToast();

  const { data: ipPool = [], refetch } = useQuery<IpPool[]>({
    queryKey: ["/api/ip-pool"],
  });

  const addIpMutation = useMutation({
    mutationFn: async (data: { ipAddress: string; ipType: string }) => {
      return apiRequest("POST", "/api/ip-pool", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "IP address added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ip-pool"] });
      setIsAddModalOpen(false);
      setNewIpAddress("");
      setNewIpType("IPv4");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add IP address",
        variant: "destructive",
      });
    },
  });

  const deleteIpMutation = useMutation({
    mutationFn: async (ipId: string) => {
      return apiRequest("DELETE", `/api/ip-pool/${ipId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "IP address removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ip-pool"] });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to remove IP address",
        variant: "destructive",
      });
    },
  });

  const validateIpAddress = (ip: string, type: "IPv4" | "IPv6"): boolean => {
    if (type === "IPv4") {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      return ipv4Regex.test(ip);
    } else {
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
      return ipv6Regex.test(ip);
    }
  };

  const handleAddIp = () => {
    if (!newIpAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter an IP address",
        variant: "destructive",
      });
      return;
    }

    if (!validateIpAddress(newIpAddress, newIpType)) {
      toast({
        title: "Error",
        description: `Invalid ${newIpType} address format`,
        variant: "destructive",
      });
      return;
    }

    addIpMutation.mutate({
      ipAddress: newIpAddress,
      ipType: newIpType,
    });
  };

  const availableCount = ipPool.filter(ip => ip.isAvailable).length;
  const assignedCount = ipPool.filter(ip => !ip.isAvailable).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">IP Pool Management</h1>
              <p className="text-sm text-gray-600">Manage IPv4 and IPv6 addresses for proxy users</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total IPs</p>
                    <p className="text-2xl font-bold text-gray-900">{ipPool.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Network className="text-blue-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available</p>
                    <p className="text-2xl font-bold text-green-600">{availableCount}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <CheckCircle className="text-green-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Assigned</p>
                    <p className="text-2xl font-bold text-red-600">{assignedCount}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-full">
                    <XCircle className="text-red-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* IP Pool Table */}
          <Card className="bg-white shadow">
            <CardHeader className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">IP Address Pool</h3>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-blue-600">
                      <Plus className="mr-2 w-4 h-4" />
                      Add IP Address
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New IP Address</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">IP Address</label>
                        <Input
                          placeholder="192.168.1.100 or 2001:db8::1"
                          value={newIpAddress}
                          onChange={(e) => setNewIpAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">IP Type</label>
                        <Select value={newIpType} onValueChange={(value: "IPv4" | "IPv6") => setNewIpType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IPv4">IPv4</SelectItem>
                            <SelectItem value="IPv6">IPv6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddIp} disabled={addIpMutation.isPending}>
                          {addIpMutation.isPending ? "Adding..." : "Add IP"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>IP Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned User</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipPool.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No IP addresses found. Add your first IP to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ipPool.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono">{ip.ipAddress}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ip.ipType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={ip.isAvailable ? "default" : "secondary"}
                            className={
                              ip.isAvailable ? 
                              "bg-green-100 text-green-800 hover:bg-green-100" : 
                              "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {ip.isAvailable ? "Available" : "Assigned"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ip.assignedUserId ? ip.assignedUserId : "-"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteIpMutation.mutate(ip.id)}
                            disabled={deleteIpMutation.isPending || !ip.isAvailable}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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