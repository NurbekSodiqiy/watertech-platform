import { SectionLanding } from "@/components/SectionLanding";
import { findNode } from "@/lib/site-config";

export default function Page() {
  return <SectionLanding node={findNode("/customers")!} />;
}
