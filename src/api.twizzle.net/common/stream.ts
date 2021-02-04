// UUID
import type { TwizzleUserPublicInfo } from "./user.ts";

// TODO: include prefix in type?
export type StreamID = string;
export type ClientID = string;
export type StreamClientToken = string;

export interface StreamInfo {
  streamID: StreamID;
  senders: TwizzleUserPublicInfo[];
}

export interface StreamsGETResponse {
  streams: StreamInfo[];
}

export type StreamsPOSTResponse = {
  stream: StreamInfo;
};

// TOOD: Reuse https://github.com/cubing/cubing.js/blob/ec71ca736f29bae8ed6104f887a5cbe5fc962e8c/src/cubing/bluetooth/bluetooth-puzzle.ts#L12-L18
export interface MoveEvent {
  // deno-lint-ignore no-explicit-any
  latestMove: any;
  timeStamp: number;
  // deno-lint-ignore no-explicit-any
  state: any; // string
}

export interface BinaryMoveEvent {
  // deno-lint-ignore no-explicit-any
  latestMove: any;
  timeStamp: number;
  binaryState: string; // string
}

// TODO: Reuse https://github.com/cubing/cubing.js/blob/ec71ca736f29bae8ed6104f887a5cbe5fc962e8c/src/cubing/bluetooth/bluetooth-puzzle.ts#L21:L30
export interface OrientationEvent {
  quaternion: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  timeStamp: number;
  // debug?: Record<string, unknown>;
}
