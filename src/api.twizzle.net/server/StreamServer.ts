
import {
  WebSocket,
  WebSocketServer,
  WebSocketState
} from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamClientToken, StreamID } from "../common/stream.ts";

// deno-lint-ignore no-explicit-any
type WebSockerServer = any; // TODO

type InitialIncomingMessage =
  | {
      event: "request-to-send";
    }
  | {
      event: "stream-list";
    }
  | {
      event: "request-to-receive";
      streamID: StreamID;
    };

type InitialOutgoingMessage = {
  event: "start-send";
  streamID: StreamID;
} | {
  event: "start-listen";
  streamID: StreamID;
};

export class Stream {
  private sendingClients: Set<WebSocket> = new Set();
  private receivingClients: Set<WebSocket> = new Set();
  public streamID: StreamID = newStreamID();
  public sendingClientToken: StreamClientToken = newStreamClientToken();
  constructor() {
    twizzleLog("Created stream", this.streamID)
  }

  addSendingClient(ws: WebSocket): void {
    // TODO: limit to one sneder for now?
    if (ws.state !== WebSocketState.OPEN) {
      console.log(
        "could not add sending client socket because it's not open",
        ws
      );
      return;
    }
    ws.on("message", this.onMessage.bind(this));
    ws.once("close", () => {
      this.removeSendingClient(ws);
    });
    console.log("adding sending client socket to stream", this.streamID);
    this.sendingClients.add(ws);
  }

  onMessage(messageFromSender: string): void {
    console.info("server received", messageFromSender);
    const messageJSON = JSON.parse(messageFromSender);
    switch (messageJSON.event) {
      case "move": {
        this.sendToAllReceivers(messageJSON);
        break;
      }
    }
  }

  // TODO: message type
  // deno-lint-ignore no-explicit-any
  sendToAllReceivers(messageToReceivers: any): void {
    const messageString = JSON.stringify(messageToReceivers);
    for (const receiver of this.receivingClients) {
      receiver.send(messageString);
    }
  }

  removeSendingClient(ws: WebSocket): void {
    if (ws.state === WebSocketState.OPEN) {
      ws.close();
    }
    this.sendingClients.delete(ws);
    // TODO: Remove stream if there are nosenders remaining?
  }

  addReceivingClient(ws: WebSocket): void {
    ws.once("close", () => {
      this.removeReceivingClient(ws);
    });
    this.receivingClients.add(ws);
  }

  removeReceivingClient(ws: WebSocket): void {
    if (ws.state === WebSocketState.OPEN) {
      ws.close();
    }
    this.receivingClients.delete(ws);
  }

  toString(): string {
    return `[${this.streamID}, ${this.sendingClients.size} sending, ${this.receivingClients.size} receiving]`
  }
}

function buf2hex(buffer: Uint8Array): string {
  return Array.prototype.map
    .call(buffer, (x: number) => x.toString(16).padStart(2, "0"))
    .join("");
}

function newStreamID(): StreamID {
  var array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return "twizzle_stream_" + buf2hex(array);
}

function newStreamClientToken(): StreamClientToken {
  var array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return "token_" + buf2hex(array);
}

export class StreamServer {
  streams: Map<StreamID, Stream> = new Map<StreamID, Stream>();

  private wss: WebSockerServer;
  constructor(port: number) {
    twizzleLog(this, "starting on port:", port);
    this.wss = new WebSocketServer(port);
    this.wss.on("connection", this.onConnection.bind(this));
  }

  onConnection(ws: WebSocket): void {
    ws.once("message", (message: string) => {
      console.log("new connection!", message);
      const messageJSON: InitialIncomingMessage = JSON.parse(message);
      switch (messageJSON.event) {
        case "request-to-send": {
          console.log("request-to-send", messageJSON);
          this.registerSender(ws);
          break;
        }
        case "stream-list": {
          console.log("stream-list", messageJSON);
          const streamList = Array.from(this.streams.values()).map(
            (stream: Stream) => stream.streamID
          );
          ws.send(JSON.stringify(streamList));
          ws.close();
          break;
        }
        case "request-to-receive": {
          console.log("request-to-receive", messageJSON);
          const streamID = messageJSON.streamID;
          const stream = this.streams.get(streamID);
          if (stream) {
            // TODO: notify client?
            stream.addReceivingClient(ws);
          } else {
            ws.close();
          }
          break;
        }
      }
    });
  }

  registerSender(ws: WebSocket): void {
    const stream = new Stream();
    const initialOutgoingMessage: InitialOutgoingMessage = {
      event: "start-send",
      streamID: stream.streamID,
    };
    stream.addSendingClient(ws);
    ws.send(JSON.stringify(initialOutgoingMessage));
    this.streams.set(stream.streamID, stream);
    console.info(`Stream created: ${stream}`);
  }

  newStream(): Stream {
    const stream = new Stream();
    this.streams.set(stream.streamID, stream);
    return stream;
  }
}

