import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Globe, Package } from "lucide-react";

interface Package {
  id: string;
  name: string;
  description: string;
  dataLimitGB: number;
  timeLimit: number;
  price: number;
}

interface IPAddress {
  id: string;
  ipAddress: string;
  ipType: string;
  isAvailable: boolean;
}

export default function CreateUserWorkingSimple() {
  const [, setLocation] = useLocation();
  const [packages, setPackages] = useState<Package[]>([]);
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    ipAddress: "",
    port: 1080,
    dataLimit: 10, // GB
    daysValid: 30,
    packageId: ""
  });

  useEffect(() => {
    fetch("/api/packages")
      .then(res => res.json())
      .then(data => setPackages(data || []))
      .catch(console.error);

    fetch("/api/ip-pool")
      .then(res => res.json())
      .then(data => setIpAddresses((data || [])))
      .catch(console.error);
  }, []);

  const handlePackageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const packageId = e.target.value;
    const selectedPackage = packages.find(pkg => pkg.id === packageId);
    
    setFormData(prev => ({
      ...prev,
      packageId,
      dataLimit: selectedPackage ? selectedPackage.dataLimitGB : 10,
      daysValid: selectedPackage ? selectedPackage.timeLimit : 30
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // Calculate expiration date and auto-assign IP
    const expiresAt = Math.floor(Date.now() / 1000) + (formData.daysValid * 24 * 60 * 60);
    const dataLimitBytes = formData.dataLimit * 1024 * 1024 * 1024; // Convert GB to bytes

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          port: formData.port,
          dataLimit: dataLimitBytes,
          expiresAt: expiresAt,
          // IP will be auto-assigned by the system from the pool
        }),
      });

      if (response.ok) {
        alert("User created successfully!");
        setLocation("/users");
      } else {
        const error = await response.json();
        alert("Error: " + error.message);
      }
    } catch (error) {
      alert("Error creating user: " + error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/users")}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Create SOCKS5 User</h1>
                <p className="text-sm text-gray-600">Add a new user to the proxy server</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
              {/* Package Selection */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Package className="h-5 w-5 text-orange-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Package Selection</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Choose a package to auto-fill limits (optional)
                </p>
                
                <select
                  value={formData.packageId}
                  onChange={handlePackageSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="">Select package (optional)</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.dataLimitGB}GB for {pkg.timeLimit} days (${pkg.price})
                    </option>
                  ))}
                </select>

                {formData.packageId && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-1">
                      {packages.find(p => p.id === formData.packageId)?.name}
                    </h4>
                    <p className="text-sm text-blue-700 mb-2">
                      {packages.find(p => p.id === formData.packageId)?.description}
                    </p>
                    <div className="text-xs text-blue-800">
                      Data: {formData.dataLimit}GB | Valid: {formData.daysValid} days
                    </div>
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <User className="h-5 w-5 text-purple-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              {/* Network Configuration */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Globe className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Network Configuration</h3>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-900 mb-2">🌐 Automatic IP Assignment</h4>
                  <p className="text-sm text-green-700 mb-2">
                    IP addresses are automatically assigned from the available pool. Users can share IPs without restrictions.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SOCKS5 Port
                      </label>
                      <input
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="1080"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">Standard SOCKS5 port</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Protocol Support
                      </label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm">
                        All Protocols Allowed
                      </div>
                      <p className="text-xs text-gray-500 mt-1">HTTP, HTTPS, FTP, SSH, etc.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Limit (GB)
                    </label>
                    <input
                      type="number"
                      value={formData.dataLimit}
                      onChange={(e) => setFormData({...formData, dataLimit: parseInt(e.target.value)})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Days
                    </label>
                    <input
                      type="number"
                      value={formData.daysValid}
                      onChange={(e) => setFormData({...formData, daysValid: parseInt(e.target.value)})}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}