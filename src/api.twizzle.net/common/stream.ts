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
