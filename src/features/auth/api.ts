import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/constants/routes";
import type { LoginInput } from "@/shared/schemas/auth.schema";
import type { SessionUserDTO } from "@/shared/types/dto";

export const authApi = {
  login: (input: LoginInput) => apiClient.post<SessionUserDTO>(API_ROUTES.auth.login, input),
  logout: () => apiClient.post<void>(API_ROUTES.auth.logout),
  me: (signal?: AbortSignal) => apiClient.get<SessionUserDTO>(API_ROUTES.auth.me, undefined, signal),
};
