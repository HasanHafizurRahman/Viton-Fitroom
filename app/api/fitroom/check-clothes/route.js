// app/api/fitroom/check-clothes/route.js
import axios from "axios";
import FormData from "form-data";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        const fd = await req.formData();
        const inputFile = fd.get("input_image");
        if (!inputFile) return new Response(JSON.stringify({ error: "input_image required" }), { status: 400 });

        const out = new FormData();
        const buf = Buffer.from(await inputFile.arrayBuffer());
        out.append("input_image", buf, { filename: "cloth.jpg", contentType: "image/jpeg" });

        const frResp = await axios.post("https://platform.fitroom.app/api/tryon/input_check/v1/clothes", out, {
            headers: { ...out.getHeaders(), "X-API-KEY": process.env.FITROOM_API_KEY },
            timeout: 30000,
        });

        return new Response(JSON.stringify(frResp.data), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
        console.error("check-clothes error:", err?.response?.data || err?.message || err);
        return new Response(JSON.stringify({ error: err?.message ?? "Server error" }), { status: 500 });
    }
}
