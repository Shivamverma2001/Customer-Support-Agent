import { useEffect, useState } from "react";
import { apiClient } from "./api-client";
import "./App.css";

function App() {
  const [health, setHealth] = useState<{ status?: string; service?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.api.health
      .$get()
      .then((r: Response) => r.json() as Promise<{ status?: string; service?: string }>)
      .then(setHealth)
      .catch(() => setError("Backend not reachable. Start the API (see README)."));
  }, []);

  return (
    <div className="app">
      <h1>AI Customer Support</h1>
      <p className="subtitle">Multi-agent support system (Phase 1 – Foundation)</p>
      <div className="status">
        {error && <p className="error">{error}</p>}
        {health && (
          <p className="health">
            API: <strong>{health.service ?? "customer-support-api"}</strong> —{" "}
            <strong>{health.status ?? "ok"}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
