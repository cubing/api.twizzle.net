export { TwizzleAPIClient } from "./TwizzleAPIClient.ts";
export type { TwizzleAPIStreamClient } from "./TwizzleAPIStreamClient.ts";

import { clientScaffoldingImpl } from "./scaffolding.ts";

export function clientScaffolding(endpoint: string) {
  clientScaffoldingImpl(endpoint);
}
