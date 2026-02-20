import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

export default function Dashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await client.get(ENDPOINTS.ITEMS);
      setItems(response.data);
    } catch {
      setError("Failed to load items.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Later we’ll clear token here
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Dashboard</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      {loading && <p>Loading items...</p>}
      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.grid}>
        {!loading && items.length === 0 && <p>No items found.</p>}

        {items.map((item) => (
          <div key={item.id} style={styles.card}>
            <h3>{item.name || "Untitled Item"}</h3>
            <p>ID: {item.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    background: "#f4f6f9",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  logoutBtn: {
    padding: "8px 15px",
    borderRadius: "5px",
    border: "none",
    background: "#ef4444",
    color: "white",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
  },
  error: {
    color: "red",
  },
};