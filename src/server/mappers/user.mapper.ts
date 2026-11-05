import "server-only";
import type { SessionUserDTO } from "@/shared/types/dto";
import type { UserRecord } from "../repositories/types";

export function toSessionUserDTO(user: UserRecord): SessionUserDTO {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.authorProfile?.code ? { authorCode: user.authorProfile.code } : {}),
  };
}
