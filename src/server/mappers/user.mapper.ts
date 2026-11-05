import "server-only";
import type { SessionUserDTO } from "@/shared/types/dto";
import type { UserRecord } from "../repositories/types";

export function toSessionUserDTO(u: UserRecord): SessionUserDTO {
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role,
    ...(u.authorProfile?.code ? { authorCode: u.authorProfile.code } : {}),
  };
}
