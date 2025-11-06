// app/api/fitroom/tasks/route.js
import axios from "axios";
import FormData from "form-data";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        const fd = await req.formData();

        const modelFile = fd.get("model_image");
        const clothFile = fd.get("cloth_image");
        const productImageUrl = fd.get("productImageUrl")?.toString();
        const cloth_type = fd.get("cloth_type")?.toString() || "upper";
        const hd_mode = fd.get("hd_mode")?.toString() || "false";

        if (!modelFile) {
            return new Response(JSON.stringify({ error: "model_image required" }), { status: 400 });
        }

        // Build node FormData (form-data library) to send to FitRoom
        const out = new FormData();

        // model image -> Buffer
        const modelBuf = Buffer.from(await modelFile.arrayBuffer());
        out.append("model_image", modelBuf, { filename: "model.jpg", contentType: "image/jpeg" });

        // cloth: either productImageUrl (server fetch) or uploaded file
        if (productImageUrl) {
            const imgResp = await axios.get(productImageUrl, { responseType: "arraybuffer", timeout: 30000 });
            const ct = imgResp.headers["content-type"] || "image/jpeg";
            out.append("cloth_image", Buffer.from(imgResp.data), { filename: "cloth.jpg", contentType: ct });
        } else if (clothFile) {
            const clothBuf = Buffer.from(await clothFile.arrayBuffer());
            out.append("cloth_image", clothBuf, { filename: "cloth.jpg", contentType: "image/jpeg" });
        } else {
            return new Response(JSON.stringify({ error: "cloth_image or productImageUrl required" }), { status: 400 });
        }

        out.append("cloth_type", cloth_type);
        if (hd_mode === "true") out.append("hd_mode", "true");

        const frResp = await axios.post(
            "https://platform.fitroom.app/api/tryon/v2/tasks",
            out,
            {
                headers: {
                    ...out.getHeaders(),
                    "X-API-KEY": process.env.FITROOM_API_KEY,
                },
                timeout: 120000,
            }
        );

        return new Response(JSON.stringify(frResp.data), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
        console.error("tasks route error:", err?.response?.data || err?.message || err);
        const body = err?.response?.data ?? { message: err?.message ?? "Server error" };
        return new Response(JSON.stringify({ error: body }), { status: 500 });
    }
}
