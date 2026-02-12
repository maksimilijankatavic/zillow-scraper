export type LogLevel = "info" | "warn" | "error" | "success";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  scraped?: number;
  total?: number;
}

export type LogListener = (entry: LogEntry) => void;

export class JobLogger {
  private listeners: Set<LogListener> = new Set();
  private history: LogEntry[] = [];
  scraped = 0;
  total = 100;

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    // Send history to new subscriber
    for (const entry of this.history) {
      listener(entry);
    }
    return () => this.listeners.delete(listener);
  }

  log(level: LogLevel, message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      scraped: this.scraped,
      total: this.total,
    };
    this.history.push(entry);
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {}
    }
  }

  info(msg: string) {
    this.log("info", msg);
  }
  warn(msg: string) {
    this.log("warn", msg);
  }
  error(msg: string) {
    this.log("error", msg);
  }
  success(msg: string) {
    this.log("success", msg);
  }

  getHistory(): LogEntry[] {
    return [...this.history];
  }
}
