import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AQI Memory",
    short_name: "AQI Memory",
    description: "India's air quality record. Unedited. Forever.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png",  sizes: "192x192",  type: "image/png" },
      { src: "/icon-512.png",  sizes: "512x512",  type: "image/png" },
      { src: "/icon-512.png",  sizes: "512x512",  type: "image/png", purpose: "maskable" },
    ],
    categories: ["environment", "health", "utilities"],
    lang: "en-IN",
  };
}
