import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "18px", background: "#142821", color: "#bff2d4", fontFamily: "sans-serif", fontSize: "25px", fontWeight: 800, letterSpacing: "-2px" }}>20</div>,
    size,
  );
}
