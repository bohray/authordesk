"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Separator } from "@/components/ui/Separator";
import { FormField, describedBy } from "@/components/forms/FormField";
import { DemoAccounts } from "@/features/auth/components/DemoAccounts";
import { Wordmark } from "@/components/brand/Logo";
import { useLogin } from "@/features/auth/hooks/useAuthMutations";
import { getErrorMessage, getFieldErrors } from "@/lib/apiClient";
import { homeForRole } from "@/constants/routes";
import { uiMessages } from "@/constants/messages";
import { authMessages, loginFields, portalPathPrefixes, type DemoAccount } from "@/constants/auth";
import { loginSchema, type LoginInput } from "@/shared/schemas/auth.schema";
import type { Role } from "@/shared/constants/roles";

/** Only follow same-origin `next` paths that belong to the signed-in role's portal. */
function safeNext(next: string | null, role: Role): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next.startsWith(portalPathPrefixes[role]) ? next : null;
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

  const handleLogin = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const user = await login.mutateAsync(values);
      const target = safeNext(searchParams.get("next"), user.role) ?? homeForRole(user.role);
      // Full navigation so the proxy sees the freshly set session cookie.
      window.location.assign(target);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      for (const { name } of loginFields) {
        const message = fieldErrors[name];
        if (message) setError(name, { message });
      }
      setServerError(getErrorMessage(err));
    }
  });

  const handleDemoPick = (account: DemoAccount) => {
    setServerError(null);
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
  };

  // Stay disabled after success too: the full-page navigation is still in flight.
  const submitting = login.isPending || login.isSuccess;
  const email = useWatch({ control, name: "email" });

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex justify-center lg:hidden">
        <Wordmark textClassName="text-xl" />
      </div>
      <Card className="shadow-lg shadow-primary/5 dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">{uiMessages.login.title}</CardTitle>
          <CardDescription>{uiMessages.login.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {serverError && (
              <Alert variant="destructive" className="bg-destructive/5">
                <AlertCircle aria-hidden />
                <AlertTitle>{authMessages.signInFailedTitle}</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            {/*
              One `disabled` on the fieldset locks every field and the submit button natively
              while signing in, so credentials can't change mid-request. Safe with RHF:
              handleSubmit has already read the values before the request starts.
            */}
            <fieldset disabled={submitting} aria-busy={submitting} className="min-w-0 space-y-4">
              {loginFields.map((field) => {
                const error = errors[field.name]?.message;
                return (
                  <FormField key={field.name} id={field.name} label={field.label} error={error}>
                    <Input
                      id={field.name}
                      type={field.type}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      aria-invalid={!!error || undefined}
                      aria-describedby={describedBy(field.name, { error })}
                      {...register(field.name)}
                    />
                  </FormField>
                );
              })}
              <Button type="submit" className="h-9 w-full">
                {submitting && <Loader2 className="animate-spin" aria-hidden />}
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </fieldset>
          </form>
          <Separator />
          <DemoAccounts selectedEmail={email} onPick={handleDemoPick} disabled={submitting} />
        </CardContent>
      </Card>
    </div>
  );
}
