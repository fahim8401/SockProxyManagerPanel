import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Package, DollarSign, Clock, Users, Database } from "lucide-react";
import { Package as PackageType, insertPackageSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/ui/sidebar";

export default function PackageManagement() {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    dataLimitGB: 10,
    timeLimit: 30,
    maxConnections: 1,
    allowedIPs: "",
    price: 0,
    isActive: true,
  });

  // Fetch packages
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["/api/packages"],
  });

  // Create package mutation
  const createPackageMutation = useMutation({
    mutationFn: async (packageData: any) => {
      await apiRequest("POST", "/api/packages", packageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Package created",
        description: "New package has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating package",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update package mutation
  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PUT", `/api/packages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setIsEditModalOpen(false);
      setEditingPackage(null);
      resetForm();
      toast({
        title: "Package updated",
        description: "Package has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating package",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete package mutation
  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Package deleted",
        description: "Package has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting package",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      dataLimitGB: 10,
      timeLimit: 30,
      maxConnections: 1,
      allowedIPs: "",
      price: 0,
      isActive: true,
    });
  };

  const handleCreatePackage = () => {
    createPackageMutation.mutate(formData);
  };

  const handleEditPackage = (pkg: PackageType) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      dataLimitGB: pkg.dataLimitGB,
      timeLimit: pkg.timeLimit,
      maxConnections: pkg.maxConnections || 1,
      allowedIPs: pkg.allowedIPs || "",
      price: Number(pkg.price) || 0,
      isActive: Boolean(pkg.isActive),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePackage = () => {
    if (editingPackage) {
      updatePackageMutation.mutate({
        id: editingPackage.id,
        data: formData,
      });
    }
  };

  const handleDeletePackage = (id: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      deletePackageMutation.mutate(id);
    }
  };

  const activePackages = packages.filter((pkg: PackageType) => pkg.isActive);
  const totalRevenue = packages.reduce((sum: number, pkg: PackageType) => sum + (Number(pkg.price) || 0), 0);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Package Management</h1>
              <p className="text-sm text-gray-600">Create and manage proxy service packages</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Packages</p>
                    <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Package className="text-blue-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Packages</p>
                    <p className="text-2xl font-bold text-green-600">{activePackages.length}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <Users className="text-green-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">${totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full">
                    <DollarSign className="text-purple-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Data Limit</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {packages.length > 0 
                        ? Math.round(packages.reduce((sum: number, pkg: PackageType) => sum + pkg.dataLimitGB, 0) / packages.length)
                        : 0}GB
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full">
                    <Database className="text-orange-600 w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Packages Table */}
          <Card className="bg-white shadow">
            <CardHeader className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Service Packages</h3>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-blue-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Package
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Package</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Package Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Premium Plan"
                          />
                        </div>
                        <div>
                          <Label htmlFor="price">Price ($)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Package description and features"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="dataLimit">Data Limit (GB)</Label>
                          <Input
                            id="dataLimit"
                            type="number"
                            value={formData.dataLimitGB}
                            onChange={(e) => setFormData({ ...formData, dataLimitGB: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="timeLimit">Time Limit (Days)</Label>
                          <Input
                            id="timeLimit"
                            type="number"
                            value={formData.timeLimit}
                            onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxConnections">Max Connections</Label>
                          <Input
                            id="maxConnections"
                            type="number"
                            value={formData.maxConnections}
                            onChange={(e) => setFormData({ ...formData, maxConnections: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="allowedIPs">Allowed IPs (comma-separated, optional)</Label>
                        <Input
                          id="allowedIPs"
                          value={formData.allowedIPs}
                          onChange={(e) => setFormData({ ...formData, allowedIPs: e.target.value })}
                          placeholder="192.168.1.1, 10.0.0.1"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        />
                        <Label htmlFor="isActive">Package Active</Label>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreatePackage} disabled={createPackageMutation.isPending}>
                          {createPackageMutation.isPending ? "Creating..." : "Create Package"}
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
                    <TableHead>Package Name</TableHead>
                    <TableHead>Data Limit</TableHead>
                    <TableHead>Time Limit</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Loading packages...
                      </TableCell>
                    </TableRow>
                  ) : packages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No packages found. Create your first package to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    packages.map((pkg: PackageType) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{pkg.name}</p>
                            <p className="text-sm text-gray-500">{pkg.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-800">
                            {pkg.dataLimitGB}GB
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{pkg.timeLimit} days</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">${Number(pkg.price).toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={pkg.isActive ? "default" : "secondary"}
                            className={
                              pkg.isActive ? 
                              "bg-green-100 text-green-800 hover:bg-green-100" : 
                              "bg-gray-100 text-gray-800 hover:bg-gray-100"
                            }
                          >
                            {pkg.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditPackage(pkg)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeletePackage(pkg.id)}
                              disabled={deletePackageMutation.isPending}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Edit Package Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Package</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Package Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-price">Price ($)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-dataLimit">Data Limit (GB)</Label>
                    <Input
                      id="edit-dataLimit"
                      type="number"
                      value={formData.dataLimitGB}
                      onChange={(e) => setFormData({ ...formData, dataLimitGB: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-timeLimit">Time Limit (Days)</Label>
                    <Input
                      id="edit-timeLimit"
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-maxConnections">Max Connections</Label>
                    <Input
                      id="edit-maxConnections"
                      type="number"
                      value={formData.maxConnections}
                      onChange={(e) => setFormData({ ...formData, maxConnections: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-allowedIPs">Allowed IPs (comma-separated)</Label>
                  <Input
                    id="edit-allowedIPs"
                    value={formData.allowedIPs}
                    onChange={(e) => setFormData({ ...formData, allowedIPs: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="edit-isActive">Package Active</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePackage} disabled={updatePackageMutation.isPending}>
                    {updatePackageMutation.isPending ? "Updating..." : "Update Package"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}