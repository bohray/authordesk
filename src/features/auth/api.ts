import { apiClient } from "@/lib/apiClient";
import { apiRoutes } from "@/constants/routes";
import type { LoginInput } from "@/shared/schemas/auth.schema";
import type { SessionUserDTO } from "@/shared/types/dto";

export const authApi = {
  login: (input: LoginInput) => apiClient.post<SessionUserDTO>(apiRoutes.auth.login, input),
  logout: () => apiClient.post<void>(apiRoutes.auth.logout),
  me: (signal?: AbortSignal) => apiClient.get<SessionUserDTO>(apiRoutes.auth.me, undefined, signal),
};
