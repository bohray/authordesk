"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/features/auth/api";
import { routes } from "@/constants/routes";
import { authMessages } from "@/constants/auth";
import { getErrorMessage } from "@/lib/apiClient";

export function useLogin() {
  return useMutation({ mutationFn: authApi.login });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      // Full navigation so the proxy re-evaluates the (now cleared) session cookie.
      window.location.assign(routes.login);
    },
    onError: (err) => toast.error(getErrorMessage(err, authMessages.signOutFailed)),
  });
}
