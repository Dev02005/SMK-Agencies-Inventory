import { ImageResponse } from "next/og";
import { getFirm } from "@/lib/data";

export const alt = "SKA: sales, money, stock and deliveries";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when a link to the app is shared on WhatsApp, email or social media; names the primary firm. */
export default async function OpengraphImage() {
  const firm = await getFirm();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#f5f5f7" }}>
        <div
          style={{
            width: 132,
            height: 132,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 30,
            background: "#0071e3",
            color: "#ffffff",
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: 2,
            WebkitTextStroke: "1.5px #ffffff",
          }}
        >
          SKA
        </div>
        <div style={{ marginTop: 44, fontSize: 68, color: "#1d1d1f", WebkitTextStroke: "1px #1d1d1f", letterSpacing: -1 }}>{firm.name}</div>
        <div style={{ marginTop: 14, fontSize: 34, color: "#636368" }}>{firm.address ? `Wholesale cement & TMT steel · ${firm.address}` : "Wholesale cement & TMT steel"}</div>
      </div>
    ),
    size,
  );
}
