import { generateListingCopy, detectMissingInfo, type ListingDraft } from "@propertyx/ai";
import { route, body } from "@/lib/api";

export const POST = route(async ({ req }) => {
  const draft = await body<ListingDraft & { mode?: "check" | "write" }>(req);
  const missing = detectMissingInfo(draft);
  if (draft.mode === "check") return { missing };
  return { ...(await generateListingCopy(draft)), missing };
}, { auth: true, rate: 20 });
