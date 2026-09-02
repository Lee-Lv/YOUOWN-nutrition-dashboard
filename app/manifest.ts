import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "饮食 Dashboard",
    short_name: "饮食",
    description: "私人饮食与营养趋势看板",
    start_url: "/",
    display: "standalone",
    background_color: "#07100f",
    theme_color: "#07100f",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
