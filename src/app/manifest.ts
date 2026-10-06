import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Currency Converter",
    short_name: "Converter",
    description: "A calm, precise multi-currency converter.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#000000",
    icons: [
      { src: "/manifest-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
