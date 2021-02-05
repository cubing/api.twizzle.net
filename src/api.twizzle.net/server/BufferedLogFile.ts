import { ensureDirSync } from "https://deno.land/std@0.85.0/fs/ensure_dir.ts";
import { dirname } from "https://deno.land/std@0.85.0/path/mod.ts";

const BUFFER_DURATION_MS = 10 * 1000;

export class BufferedLogFile {
  buffer = "";

  activeTimeout: number | null = null;

  constructor(
    private filename: string,
    // deno-lint-ignore no-explicit-any
    private commonData: Record<string, any> = {},
  ) {
    ensureDirSync(dirname(filename));
  }

  // deno-lint-ignore no-explicit-any
  log(e: Record<string, any>): void {
    const now = new Date();
    e.timestampUnixMS = now.getTime();
    e.timestampHuman = now.toString();
    Object.assign(e, this.commonData);
    this.buffer += JSON.stringify(e) + "\n";
    if (this.activeTimeout === null) {
      // TODO: combine implementation with stream timeout
      this.activeTimeout = setTimeout(
        this.flush.bind(this),
        BUFFER_DURATION_MS,
      );
    }
    console.log(JSON.stringify(e, null, "  "));
  }

  flush(): void {
    // TODO: keep file open?
    Deno.writeTextFile(this.filename, this.buffer, { append: true });
    this.buffer = "";
    this.activeTimeout = null;
  }
}

export const mainErrorLog = new BufferedLogFile(
  `./data/log/main/error.log`,
);

export const mainInfoLog = new BufferedLogFile(
  `./data/log/main/info.log`,
);

export const mainAuthLog = new BufferedLogFile(
  `./data/log/main/auth.log`,
);
