import { ensureDirSync } from "https://deno.land/std@0.85.0/fs/ensure_dir.ts";
import { dirname } from "https://deno.land/std@0.85.0/path/mod.ts";

const BUFFER_DURATION_MS = 10 * 1000;

export class BufferedLogFile {
  buffer = "";

  activeTimeout: number | null = null;

  constructor(private filename: string) {
    ensureDirSync(dirname(filename));
  }

  // deno-lint-ignore no-explicit-any
  log(e: Record<string, any>): void {
    const now = new Date();
    e.timestampUnixMS = now.getTime();
    e.timestampHuman = now.toString();
    this.buffer += JSON.stringify(e) + "\n";
    if (this.activeTimeout === null) {
      this.activeTimeout = setTimeout(
        this.flush.bind(this),
        BUFFER_DURATION_MS,
      );
    }
  }

  flush(): void {
    // TODO: keep file open?
    Deno.writeTextFile(this.filename, this.buffer, { append: true });
    this.buffer = "";
    this.activeTimeout = null;
  }
}

export const mainErrorLog = new BufferedLogFile(
  `./data/log/error.log`,
);

export const mainInfoLog = new BufferedLogFile(
  `./data/log/info.log`,
);
