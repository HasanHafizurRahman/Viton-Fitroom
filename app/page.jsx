// app/page.jsx
"use client";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [clothFile, setClothFile] = useState(null);
  const [clothType, setClothType] = useState("upper");
  const [hdMode, setHdMode] = useState(false);
  const [task, setTask] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef();

  useEffect(() => {
    fetch("https://fakestoreapi.com/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch((e) => console.error(e));
    return () => clearInterval(intervalRef.current);
  }, []);

  async function createTask(e) {
    e.preventDefault();
    if (!modelFile) return alert("Upload model image (required).");
    if (!selectedProduct && !clothFile) return alert("Choose product or upload cloth.");

    setLoading(true);
    setTask(null);
    setStatus(null);
    setResultUrl(null);
    setProgress(0);

    try {
      const form = new FormData();
      form.append("model_image", modelFile);
      if (clothFile) {
        form.append("cloth_image", clothFile);
      } else if (selectedProduct) {
        form.append("productImageUrl", selectedProduct.image);
      }
      form.append("cloth_type", clothType);
      if (hdMode) form.append("hd_mode", "true");

      const resp = await fetch("/api/fitroom/tasks", {
        method: "POST",
        body: form,
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(data));

      // FitRoom's response should contain task_id
      const taskId = data.task_id || data.taskId || data.id || data.task?.task_id;
      setTask({ raw: data, task_id: taskId, status: data.status || "CREATED" });
      setStatus(data.status || "CREATED");

      pollStatus(taskId);
    } catch (err) {
      console.error("create task error:", err);
      alert("Failed to create task: " + (err.message || JSON.stringify(err)));
      setLoading(false);
    }
  }

  function pollStatus(taskId) {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/fitroom/status/${encodeURIComponent(taskId)}`);
        const j = await r.json();
        if (!r.ok) {
          console.error("status fetch failed", j);
          return;
        }
        setStatus(j.status);
        setProgress(j.progress ?? 0);

        if (j.status === "COMPLETED") {
          clearInterval(intervalRef.current);
          setResultUrl(j.download_signed_url);
          setLoading(false);
        } else if (j.status === "FAILED") {
          clearInterval(intervalRef.current);
          alert("Try-on failed: " + (j.error || "unknown"));
          setLoading(false);
        }
      } catch (err) {
        console.error("poll error:", err);
      }
    }, 1500);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>VITON — FitRoom (App Router)</h1>

      <section style={{ marginTop: 18 }}>
        <h3>1) Pick a product from FakeStore (or upload cloth)</h3>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: 8 }}>
          {products.map((p) => (
            <div key={p.id}
              onClick={() => { setSelectedProduct(p); setClothFile(null); }}
              style={{
                minWidth: 140,
                border: selectedProduct?.id === p.id ? "3px solid #111" : "1px solid #ddd",
                padding: 8,
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "center"
              }}>
              <img src={p.image} alt={p.title} style={{ width: "100%", height: 120, objectFit: "contain" }} />
              <div style={{ fontSize: 12, marginTop: 6 }}>{p.title.slice(0, 48)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          <label>
            Or upload cloth image:{" "}
            <input type="file" accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setClothFile(f); setSelectedProduct(null); }
              }} />
          </label>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h3>2) Upload model image (full body recommended)</h3>
        <input type="file" accept="image/*" onChange={(e) => setModelFile(e.target.files?.[0])} />
        {modelFile && (
          <div style={{ marginTop: 8 }}>
            <strong>Preview:</strong>
            <br />
            <img src={URL.createObjectURL(modelFile)} alt="model" style={{ width: 240, objectFit: "cover", marginTop: 8 }} />
          </div>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h3>3) Options</h3>
        <div>
          <label>
            Cloth type:
            <select value={clothType} onChange={(e) => setClothType(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="upper">upper</option>
              <option value="lower">lower</option>
              <option value="full_set">full_set</option>
              <option value="combo">combo</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>
            <input type="checkbox" checked={hdMode} onChange={(e) => setHdMode(e.target.checked)} /> Use HD mode
          </label>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <form onSubmit={createTask}>
          <button type="submit" disabled={loading} style={{ padding: "10px 16px", fontSize: 16 }}>
            {loading ? "Processing..." : "Create Try-on Task"}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 18 }}>
        <h3>Status</h3>
        {task && <div>
          <div><strong>task_id:</strong> {task.task_id || (task.raw && (task.raw.task_id || task.raw.id)) || "—"}</div>
          <div><strong>status:</strong> {status}</div>
          <div><strong>progress:</strong> {progress}%</div>
        </div>}
        {resultUrl && (
          <div style={{ marginTop: 12 }}>
            <h4>Result image</h4>
            <img src={resultUrl} alt="tryon" style={{ maxWidth: "100%", height: "auto" }} />
            <div style={{ marginTop: 6 }}>
              <a href={resultUrl} target="_blank" rel="noreferrer">Open full image</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
