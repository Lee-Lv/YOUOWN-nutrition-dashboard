import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutrition Dashboard",
    short_name: "Nutrition",
    description: "Personal nutrition and calorie trend dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#07100f",
    theme_color: "#07100f",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
