// TODO: hook up to persistent logging for the server.
// deno-lint-ignore no-explicit-any ban-types
export function twizzleLog(context: Object, ...args: any[]) {
  console.info(`[${context.constructor.name}]`, ...args);
}
