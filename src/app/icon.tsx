import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/shell/app-icon-art";

/** PNG icons for the browser tab and for installing the app: /icon/192, /icon/512 and /icon/maskable. */
export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
    { id: "maskable", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const key = String(await id);
  const size = key === "192" ? 192 : 512;
  return new ImageResponse(<AppIconArt size={size} rounded={key !== "maskable"} />, { width: size, height: size });
}
