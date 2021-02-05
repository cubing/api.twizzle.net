import { StreamID } from "../../api.twizzle.net/common/stream";
import { StreamAuthMode } from "../../api.twizzle.net/client/Stream";

export function getStreamID(): StreamID | null {
  return new URL(location.href).searchParams.get("stream") || null;
}

const actions = { "send": true, "view": true, "auto": true };
type Action = keyof typeof actions;
export function getMode(): Action {
  const param = new URL(location.href).searchParams.get("action");
  if (actions[param]) {
    return param as Action;
  }
  return "auto";
}
