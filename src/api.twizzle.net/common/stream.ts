// UUID
// TODO: include prefix in type?
export type StreamID = string;
export type ClientID = string;
export type StreamClientToken = string;

export interface StreamInfo {
  streamID: StreamID;
  streamClientToken?: StreamClientToken;
}

export interface StreamsGETResponse {
  streams: StreamInfo[];
}

export type StreamsPOSTResponse = StreamInfo;
