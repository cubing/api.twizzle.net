import { serve, Server } from "https://deno.land/std@0.85.0/http/server.ts";

export class MainServer {
  denoServer: Server;
  constructor() {
    this.denoServer = serve({ hostname: "0.0.0.0", port: 8080 });
    this.mainLoop();
  }

  async mainLoop(): Promise<void> {
    for await (const request of this.denoServer) {
      const url = new URL(request.url);
      // if (url.pathname.startsWith("/")
      console.log(url);
      // request.response({status: 200})
    }
  }
}
