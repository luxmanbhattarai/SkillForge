import satori from "satori";
import { readFile } from "node:fs/promises";

const fontData = await readFile("./fonts/Inter-Regular.ttf");

const svg = await satori(
  <div
    style={{
      display: "flex",
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      background: "#fff8ec",
      color: "#1a1a1a",
      fontFamily: "Inter",
      fontSize: 64,
    }}
  >
    Hungry Starter?
  </div>,
  {
    width: 1200,
    height: 630,
    fonts: [{ name: "Inter", data: fontData, weight: 400, style: "normal" }],
  },
);
