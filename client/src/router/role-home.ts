import type { Role } from "@/api/types";

/** Домашний маршрут для роли. */
export function roleHome(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "director":
      return "/director";
    case "employee":
      return "/employee";
  }
}
