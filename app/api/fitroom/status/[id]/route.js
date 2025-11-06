// app/api/fitroom/status/[id]/route.js
import axios from "axios";

export const runtime = "nodejs";

export async function GET(req, context) {
    try {
        // context.params might be a Promise in Next 16; await if needed
        const maybeParams = context?.params;
        const params = (maybeParams && typeof maybeParams.then === "function")
            ? await maybeParams
            : maybeParams || {};

        const { id } = params || {};
        if (!id) {
            return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const frResp = await axios.get(
            `https://platform.fitroom.app/api/tryon/v2/tasks/${encodeURIComponent(id)}`,
            {
                headers: { "X-API-KEY": process.env.FITROOM_API_KEY },
                timeout: 30000,
            }
        );

        return new Response(JSON.stringify(frResp.data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("status route error:", err?.response?.data || err?.message || err);
        const statusCode = err?.response?.status || 500;
        const body = err?.response?.data ?? { message: err?.message ?? "Server error" };
        return new Response(JSON.stringify({ error: body }), {
            status: statusCode,
            headers: { "Content-Type": "application/json" },
        });
    }
}
