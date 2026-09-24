import type { Metadata } from "next";
import { Explore } from "@/components/explore/Explore";

export const metadata: Metadata = { title: "Explorar | Prospect" };

export default function ExplorePage() {
  return <Explore />;
}
