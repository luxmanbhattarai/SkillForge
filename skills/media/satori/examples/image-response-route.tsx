import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", fontSize: 64, background: "white" }}>
        Hungry Starter?
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
