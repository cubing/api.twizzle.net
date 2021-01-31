import { clientScaffoldingImpl } from "./scaffolding.ts";

const endpoint = "ws://127.0.0.1:4445";

export function clientScaffolding() {
  clientScaffoldingImpl(endpoint);
}
