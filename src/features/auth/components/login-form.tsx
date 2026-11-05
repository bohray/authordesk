"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FormField, describedBy } from "@/components/forms/form-field";
import { DemoAccounts } from "@/features/auth/components/demo-accounts";
import { Wordmark } from "@/components/brand/logo";
import { useLogin } from "@/features/auth/hooks/use-auth-mutations";
import { getErrorMessage, getFieldErrors } from "@/lib/api-client";
import { homeForRole } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import { loginSchema, type LoginInput } from "@/shared/schemas/auth.schema";
import type { Role } from "@/shared/constants/roles";

/** Only follow same-origin `next` paths that belong to the signed-in role's portal. */
function safeNext(next: string | null, role: Role): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  const prefix = role === "ADMIN" ? "/admin" : "/author";
  return next.startsWith(prefix) ? next : null;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const user = await login.mutateAsync(values);
      const target = safeNext(searchParams.get("next"), user.role) ?? homeForRole(user.role);
      // Full navigation so the proxy sees the freshly set session cookie.
      window.location.assign(target);
    } catch (err) {
      const fields = getFieldErrors(err);
      if (fields.email) setError("email", { message: fields.email });
      if (fields.password) setError("password", { message: fields.password });
      setServerError(getErrorMessage(err));
    }
  });

  const submitting = login.isPending || login.isSuccess;
  const email = useWatch({ control, name: "email" });

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex justify-center lg:hidden">
        <Wordmark textClassName="text-xl" />
      </div>
      <Card className="shadow-lg shadow-primary/5 dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">{MESSAGES.login.title}</CardTitle>
          <CardDescription>{MESSAGES.login.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {serverError && (
              <Alert variant="destructive" className="bg-destructive/5">
                <AlertCircle aria-hidden />
                <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            <FormField id="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email || undefined}
                aria-describedby={describedBy("email", { error: errors.email?.message })}
                {...register("email")}
              />
            </FormField>
            <FormField id="password" label="Password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password || undefined}
                aria-describedby={describedBy("password", { error: errors.password?.message })}
                {...register("password")}
              />
            </FormField>
            <Button type="submit" className="h-9 w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <Separator />
          <DemoAccounts
            selectedEmail={email}
            onPick={(a) => {
              setServerError(null);
              setValue("email", a.email, { shouldValidate: true });
              setValue("password", a.password, { shouldValidate: true });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
