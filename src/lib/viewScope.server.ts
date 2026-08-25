// -----------------------------------------------------------------------------
// Server-only half of viewScope.ts - split out specifically so no Client
// Component can transitively pull in `next/headers` (see viewScope.ts's
// comment for the build error this caused when it was one file). Only
// Server Components/Route Handlers should import this file.
// -----------------------------------------------------------------------------
import { cookies } from "next/headers";
import { VIEW_SCOPE_COOKIE, parseViewScope, type ViewScope } from "./viewScope";

export async function getViewScope(): Promise<ViewScope> {
  const store = await cookies();
  return parseViewScope(store.get(VIEW_SCOPE_COOKIE)?.value);
}
