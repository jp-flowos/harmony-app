import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harmony-app.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/club`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/info`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    {
      url: `${BASE_URL}/community`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/fortune`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    { url: `${BASE_URL}/map`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    {
      url: `${BASE_URL}/subscribe`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // In production, dynamically add club/info/community detail pages from DB
  return staticPages;
}
