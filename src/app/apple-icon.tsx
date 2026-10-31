import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/shell/app-icon-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone and iPad; iOS rounds the corners itself. */
export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={180} rounded={false} />, size);
}
