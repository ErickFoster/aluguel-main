import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error, defaultMessage = "Ocorreu um erro inesperado") {
  if (!error) return defaultMessage;

  const detail = error.response?.data?.detail;

  if (!detail) {
    return error.message || defaultMessage;
  }

  // Handle FastAPI/Pydantic validation error (array of objects)
  if (Array.isArray(detail)) {
    return detail
      .map((err) => `${err.loc?.join(".") || "Erro"}: ${err.msg}`)
      .join("\n");
  }

  // Handle single string detail
  if (typeof detail === "string") {
    return detail;
  }

  // Fallback for other object types
  return JSON.stringify(detail) || defaultMessage;
}
