import type { MetadataRoute } from "next";

import { buildRobots } from "@/seo/foundation/robots";

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
