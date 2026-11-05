"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/features/auth/api";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/lib/api-client";

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
      window.location.assign(ROUTES.login);
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't sign out. Please try again.")),
  });
}
