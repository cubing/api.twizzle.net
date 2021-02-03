// UUID
import { TwizzleUserID } from "./auth.ts";

// TODO: include prefix in type?
export type StreamID = string;
export type ClientID = string;
export type StreamClientToken = string;

export interface StreamInfo {
  streamID: StreamID;
  senders: TwizzleUserID[];
  // {
  //   twizzleUserID: string;
  //   wcaID: string | null;
  //   name: string;
  // }
}

export interface StreamsGETResponse {
  streams: StreamInfo[];
}

export type StreamsPOSTResponse = {
  stream: StreamInfo;
};
