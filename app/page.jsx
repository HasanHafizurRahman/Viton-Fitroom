"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

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

  // local previews
  const [modelPreview, setModelPreview] = useState(null);
  const [clothPreview, setClothPreview] = useState(null);

  useEffect(() => {
    fetch("https://fakestoreapi.com/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch((e) => console.error(e));
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (modelFile) {
      const url = URL.createObjectURL(modelFile);
      setModelPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setModelPreview(null);
    }
  }, [modelFile]);

  useEffect(() => {
    if (clothFile) {
      const url = URL.createObjectURL(clothFile);
      setClothPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (selectedProduct) {
      setClothPreview(selectedProduct.image);
    } else {
      setClothPreview(null);
    }
  }, [clothFile, selectedProduct]);

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

  // drag-n-drop helpers for model and cloth
  function handleDrop(e, setter) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) setter(f);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">VITON <span className="text-indigo-600">—</span> Virtual Try-On</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">HD mode</div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={hdMode} onChange={(e) => setHdMode(e.target.checked)} />
              <span className="w-11 h-6 bg-gray-200 rounded-full shadow-inner flex items-center p-1 transition-all">
                <span className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${hdMode ? "translate-x-5" : "translate-x-0"}`}></span>
              </span>
            </label>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          {/* Left column - controls */}
          <section className="col-span-5 bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-3">1 — Choose product / cloth</h2>

            <div className="flex gap-3 overflow-x-auto pb-3">
              {products.length === 0 ? (
                <div className="text-sm text-slate-400">Loading products…</div>
              ) : (
                products.map((p) => (
                  <motion.button
                    key={p.id}
                    onClick={() => { setSelectedProduct(p); setClothFile(null); }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-none w-36 p-3 rounded-lg border ${selectedProduct?.id === p.id ? "border-indigo-400 shadow-lg" : "border-slate-200"} bg-white`}
                    title={p.title}
                  >
                    <img src={p.image} alt={p.title} className="w-full h-24 object-contain mb-2" />
                    <div className="text-xs font-medium text-slate-700">{p.title.slice(0, 40)}</div>
                  </motion.button>
                ))
              )}
            </div>

            <div className="mt-4">
              <div className="text-sm text-slate-500 mb-2">Or upload your cloth image</div>
              <div
                onDrop={(e) => handleDrop(e, setClothFile)}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center gap-4"
              >
                <input
                  id="cloth-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setClothFile(f); setSelectedProduct(null); } }}
                />
                <label htmlFor="cloth-upload" className="cursor-pointer text-sm text-indigo-600 font-medium">
                  Click to upload
                </label>
                <span className="text-sm text-slate-400">or drag & drop here</span>
              </div>

              <div className="mt-3">
                {clothPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={clothPreview} alt="cloth" className="w-20 h-20 object-contain rounded-md border" />
                    <div className="text-sm text-slate-700">{selectedProduct ? selectedProduct.title : (clothFile?.name || "Uploaded image")}</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 mt-2">No cloth selected</div>
                )}
              </div>
            </div>

            <hr className="my-4" />

            <h2 className="text-lg font-semibold mb-3">2 — Upload model</h2>
            <div
              onDrop={(e) => handleDrop(e, setModelFile)}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center"
            >
              <input
                id="model-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setModelFile(f); }}
              />
              <label htmlFor="model-upload" className="cursor-pointer block text-sm text-indigo-600 font-medium">Upload model image (or drag & drop)</label>
              <div className="text-xs text-slate-400 mt-2">Full body & front-facing recommended</div>

              {modelPreview && (
                <img src={modelPreview} alt="model preview" className="mt-3 w-full rounded-md object-cover border" />
              )}
            </div>

            <hr className="my-4" />

            <h2 className="text-lg font-semibold mb-2">3 — Options</h2>
            <div className="flex items-center gap-3">
              <select value={clothType} onChange={(e) => setClothType(e.target.value)} className="px-3 py-2 border rounded-md bg-white">
                <option value="upper">upper</option>
                <option value="lower">lower</option>
                <option value="full_set">full_set</option>
                <option value="combo">combo</option>
              </select>

              <button
                onClick={createTask}
                disabled={loading}
                className={`ml-auto px-4 py-2 rounded-xl text-white font-semibold shadow-lg ${loading ? "bg-indigo-300 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {loading ? "Processing..." : "Create Try-on"}
              </button>
            </div>

            <div className="mt-4 text-sm text-slate-500">Tip: Use HD mode for higher quality (slower).</div>
          </section>

          {/* Right column - preview & status */}
          <section className="col-span-7 space-y-5">
            <div className="bg-white rounded-2xl shadow-md p-6 flex gap-6 items-start">
              <div className="w-1/2">
                <div className="text-sm text-slate-500">Model</div>
                <div className="mt-3 bg-gradient-to-b from-slate-50 to-white rounded-xl border p-3 h-[360px] flex items-center justify-center">
                  {modelPreview ? (
                    <img src={modelPreview} alt="model" className="max-h-full object-contain rounded" />
                  ) : (
                    <div className="text-slate-400">No model uploaded</div>
                  )}
                </div>
              </div>

              <div className="w-1/2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500">Cloth</div>
                  <div className="text-xs text-slate-400">{selectedProduct ? "Product from FakeStore" : clothFile ? "Uploaded" : "—"}</div>
                </div>
                <div className="mt-3 bg-gradient-to-b from-white to-slate-50 rounded-xl border p-3 h-[360px] flex items-center justify-center">
                  {clothPreview ? (
                    <img src={clothPreview} alt="cloth" className="max-h-full object-contain rounded" />
                  ) : (
                    <div className="text-slate-400">No cloth selected</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Status</div>
                  <div className="mt-1 font-medium text-slate-700">{status || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Progress</div>
                  <div className="w-52 mt-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="text-xs text-slate-400">Task ID</div>
                  <div className="mt-1 font-mono text-xs break-all">{task?.task_id || "—"}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="text-xs text-slate-400">HD</div>
                  <div className="mt-1 font-medium">{hdMode ? "Yes" : "No"}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="text-xs text-slate-400">Type</div>
                  <div className="mt-1 font-medium">{clothType}</div>
                </div>
              </div>

              {resultUrl && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold">Result</h3>
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <img src={resultUrl} alt="result" className="w-full object-contain" />
                    <div className="p-3 flex items-center justify-between bg-white">
                      <a href={resultUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-medium">Open full image</a>
                      <a download className="text-sm text-slate-500">(temporary URL)</a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* <footer className="text-center text-xs text-slate-400">Built with ❤️ • FitRoom API • FakeStore</footer> */}
          </section>
        </main>
      </div>
    </div>
  );
}
