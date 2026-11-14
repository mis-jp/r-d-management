/** An expected, user-facing failure (validation, permission, conflict). Safe to show in the UI. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID" | "UNAUTHORIZED" = "INVALID",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = (message = "You do not have permission to do that.") =>
  new AppError(message, "FORBIDDEN");
export const notFound = (message = "The requested item was not found.") => new AppError(message, "NOT_FOUND");
export const conflict = (message: string) => new AppError(message, "CONFLICT");
export const invalid = (message: string) => new AppError(message, "INVALID");
