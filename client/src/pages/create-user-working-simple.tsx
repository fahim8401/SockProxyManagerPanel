import { useState, useEffect } from "react";

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
      .then(data => setIpAddresses((data || []).filter((ip: IPAddress) => ip.isAvailable)))
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

  const generateRandomPort = () => {
    const port = Math.floor(Math.random() * (65535 - 1024) + 1024);
    setFormData(prev => ({ ...prev, port }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!formData.ipAddress) {
      alert("Please select an IP address");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          ipAddress: formData.ipAddress,
          port: formData.port,
          dataLimit: formData.dataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
          daysValid: formData.daysValid,
          packageId: formData.packageId || undefined,
          isActive: true,
          expiresAt: Math.floor((Date.now() + formData.daysValid * 24 * 60 * 60 * 1000) / 1000)
        }),
      });

      if (response.ok) {
        alert("User created successfully!");
        window.location.href = "/users";
      } else {
        const error = await response.json();
        alert("Error: " + error.message);
      }
    } catch (error) {
      alert("Error creating user: " + error);
    }
  };

  return (
    <div style={{ 
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "20px",
      backgroundColor: "#f8fafc",
      minHeight: "100vh"
    }}>
      <div style={{ 
        maxWidth: "800px", 
        margin: "0 auto",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: "#1e40af",
          color: "white",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <h1 style={{ fontSize: "24px", margin: "0 0 5px 0", fontWeight: "600" }}>
              Create SOCKS5 User
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
              Add a new user to your SOCKS5 proxy system
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/users"}
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            ← Back to Users
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "30px" }}>
          {/* Package Selection */}
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ 
              fontSize: "18px", 
              margin: "0 0 15px 0",
              color: "#1f2937",
              display: "flex",
              alignItems: "center"
            }}>
              📦 Package Selection
            </h3>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 15px 0" }}>
              Choose a package to auto-fill limits (optional)
            </p>
            
            <select
              value={formData.packageId}
              onChange={handlePackageSelect}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white"
              }}
            >
              <option value="">Select package (optional)</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} - {pkg.dataLimitGB}GB for {pkg.timeLimit} days (${pkg.price})
                </option>
              ))}
            </select>

            {formData.packageId && (
              <div style={{
                marginTop: "15px",
                padding: "15px",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "6px"
              }}>
                <h4 style={{ margin: "0 0 5px 0", color: "#1e40af" }}>
                  {packages.find(p => p.id === formData.packageId)?.name}
                </h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#3b82f6" }}>
                  {packages.find(p => p.id === formData.packageId)?.description}
                </p>
                <div style={{ fontSize: "13px", color: "#1e40af" }}>
                  Data: {formData.dataLimit}GB | Valid: {formData.daysValid} days
                </div>
              </div>
            )}
          </div>

          {/* User Details */}
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ 
              fontSize: "18px", 
              margin: "0 0 15px 0",
              color: "#1f2937",
              display: "flex",
              alignItems: "center"
            }}>
              👤 User Details
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ 
              fontSize: "18px", 
              margin: "0 0 15px 0",
              color: "#1f2937",
              display: "flex",
              alignItems: "center"
            }}>
              🌐 Network Configuration
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  IP Address *
                </label>
                <select
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    backgroundColor: "white"
                  }}
                >
                  <option value="">Select IP address</option>
                  {ipAddresses.map(ip => (
                    <option key={ip.id} value={ip.ipAddress}>
                      {ip.ipAddress} ({ip.ipType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  Port
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                    min="1024"
                    max="65535"
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                  />
                  <button
                    type="button"
                    onClick={generateRandomPort}
                    style={{
                      padding: "12px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#f9fafb",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Limits */}
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ 
              fontSize: "18px", 
              margin: "0 0 15px 0",
              color: "#1f2937",
              display: "flex",
              alignItems: "center"
            }}>
              📊 Usage Limits
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  Data Limit (GB)
                </label>
                <input
                  type="number"
                  value={formData.dataLimit}
                  onChange={(e) => setFormData({...formData, dataLimit: parseInt(e.target.value)})}
                  min="1"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "5px", color: "#374151" }}>
                  Valid For (Days)
                </label>
                <input
                  type="number"
                  value={formData.daysValid}
                  onChange={(e) => setFormData({...formData, daysValid: parseInt(e.target.value)})}
                  min="1"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: "10px", fontSize: "13px", color: "#6b7280" }}>
              📅 Expires: {new Date(Date.now() + formData.daysValid * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ 
            borderTop: "1px solid #e5e7eb",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "15px"
          }}>
            <button
              type="button"
              onClick={() => window.location.href = "/users"}
              style={{
                padding: "12px 24px",
                border: "1px solid #d1d5db",
                backgroundColor: "#f9fafb",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                border: "none",
                backgroundColor: "#1e40af",
                color: "white",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              🛡️ Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}