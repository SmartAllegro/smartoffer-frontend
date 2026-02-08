import { env } from "@/config/env";

export function getTenant() {
  return env.tenant;
}
