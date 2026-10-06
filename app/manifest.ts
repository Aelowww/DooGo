import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DooGo",
    short_name: "DooGo",
    description: "Connecting donors. Saving lives.",
    start_url: "/splash",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f5f2",
    theme_color: "#f8f5f2",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
