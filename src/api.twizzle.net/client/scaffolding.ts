import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { BareBlockMove } from "https://cdn.skypack.dev/cubing/alg";
import { StreamID } from "../common/stream.ts";

export function clientScaffoldingImpl(endpoint: string) {
  {
    const ws: WebSocket = new WebSocket(endpoint);
    ws.on("open", function () {
      console.log("ws connected!");
      ws.send(
        JSON.stringify({
          event: "request-to-send",
        })
      );

      setTimeout(() => {
        console.log("sending");
        ws.send(
          JSON.stringify({
            event: "move",
            data: {
              timestamp: 1,
              move: BareBlockMove("R", 1),
            },
          })
        );
      }, 2000);

      setTimeout(() => {
        console.log("sending");
        ws.send(
          JSON.stringify({
            event: "move",
            data: {
              timestamp: 1,
              move: BareBlockMove("F", 2),
            },
          })
        );
      }, 4000);
    });
    ws.on("message", function (message: string) {
      console.log(message);
    });
  }

  class StreamReceivingClient {
    constructor(public streamID: StreamID) {
      const ws: WebSocket = new WebSocket(endpoint);
      ws.once("open", () => {
        ws.on("message", this.onMessage.bind(this));
        ws.send(JSON.stringify({ event: "request-to-receive", streamID }));
      });
    }

    onMessage(message: string): void {
      const messageJSON = JSON.parse(message);
      console.log("client received:", messageJSON);
    }
  }

  setTimeout(() => {
    const ws: WebSocket = new WebSocket(endpoint);
    ws.on("open", () => {
      ws.on("message", function (message: string) {
        console.log(message);
        const streamID = JSON.parse(message)[0];
        console.log(streamID);
        new StreamReceivingClient(streamID);
      });
      ws.send(
        JSON.stringify({
          event: "stream-list",
        })
      );
    });
  }, 100);
}
