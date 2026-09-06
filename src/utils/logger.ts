export const log = {
  info(message: string, details?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "info", message, ...details }));
  },
  error(message: string, error?: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ level: "error", message, error: detail }));
  },
};
