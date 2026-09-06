export const log = {
  info(message: string, details?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "info", message, ...details }));
  },
  error(message: string, error?: unknown) {
    // TDLib errors can embed file paths and protocol details. Keep stderr useful
    // for correlation without putting private message/session data in host logs.
    const kind = error instanceof Error ? error.name : typeof error;
    console.error(JSON.stringify({ level: "error", message, error_kind: kind }));
  },
};
