import { useState } from "react";

export default function CreateUserSimpleWorking() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    dataLimit: "10",
    daysValid: "30"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data:", formData);
    
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dataLimit: parseInt(formData.dataLimit) * 1024 * 1024 * 1024, // Convert GB to bytes
          daysValid: parseInt(formData.daysValid),
          ipAddress: "172.100.100.100", // Default IP
          port: 1080,
          isActive: true,
          expiresAt: Math.floor((Date.now() + parseInt(formData.daysValid) * 24 * 60 * 60 * 1000) / 1000)
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
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>Create SOCKS5 User</h1>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Username *
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Email (Optional)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Data Limit (GB)
            </label>
            <input
              type="number"
              value={formData.dataLimit}
              onChange={(e) => setFormData({...formData, dataLimit: e.target.value})}
              min="1"
              style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Valid For (Days)
            </label>
            <input
              type="number"
              value={formData.daysValid}
              onChange={(e) => setFormData({...formData, daysValid: e.target.value})}
              min="1"
              style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="button"
            onClick={() => window.location.href = "/users"}
            style={{
              padding: "10px 20px",
              border: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              border: "none",
              backgroundColor: "#007bff",
              color: "white",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  );
}