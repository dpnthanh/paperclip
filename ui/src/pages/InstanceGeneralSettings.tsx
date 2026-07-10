import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatchInstanceGeneralSettings, BackupRetentionPolicy } from "@paperclipai/shared";
import {
  DAILY_RETENTION_PRESETS,
  WEEKLY_RETENTION_PRESETS,
  MONTHLY_RETENTION_PRESETS,
  DEFAULT_BACKUP_RETENTION,
} from "@paperclipai/shared";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { authApi } from "@/api/auth";
import { healthApi } from "@/api/health";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { ModeBadge } from "@/components/access/ModeBadge";
import { setLocale, useTranslation } from "@/i18n";
import { supportedLocales } from "@/i18n/locales";
import { Button } from "../components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "../lib/utils";

const FEEDBACK_TERMS_URL = import.meta.env.VITE_FEEDBACK_TERMS_URL?.trim() || "https://paperclip.ing/tos";

function localeDisplayName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
    // toLocaleUpperCase with the locale so e.g. Turkish "i" capitalizes to "İ".
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    return code;
  }
}

export function InstanceGeneralSettings() {
  const { t, i18n } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const signOutMutation = useMutation({
    mutationFn: () => authApi.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : t("settings.general.signOutFailed", { defaultValue: "Failed to sign out." }),
      );
    },
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: t("settings.nav.settings", { defaultValue: "Settings" }), href: "/company/settings" },
      { label: t("settings.nav.instanceSettings", { defaultValue: "Instance settings" }) },
      { label: t("settings.nav.general", { defaultValue: "General" }) },
    ]);
  }, [setBreadcrumbs, t]);

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
  });

  const updateGeneralMutation = useMutation({
    mutationFn: instanceSettingsApi.updateGeneral,
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : t("settings.general.updateFailed", { defaultValue: "Failed to update general settings." }),
      );
    },
  });

  if (generalQuery.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("settings.general.loading", { defaultValue: "Loading general settings..." })}
      </div>
    );
  }

  if (generalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {generalQuery.error instanceof Error
          ? generalQuery.error.message
          : t("settings.general.loadFailed", { defaultValue: "Failed to load general settings." })}
      </div>
    );
  }

  const censorUsernameInLogs = generalQuery.data?.censorUsernameInLogs === true;
  const keyboardShortcuts = generalQuery.data?.keyboardShortcuts === true;
  const feedbackDataSharingPreference = generalQuery.data?.feedbackDataSharingPreference ?? "prompt";
  const backupRetention: BackupRetentionPolicy = generalQuery.data?.backupRetention ?? DEFAULT_BACKUP_RETENTION;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">
            {t("settings.general.title", { defaultValue: "General" })}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("settings.general.description", {
            defaultValue:
              "Configure instance-wide preferences including log display, keyboard shortcuts, backup retention, and data sharing.",
          })}
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <Card className="block p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">
              {t("settings.general.deployment.title", { defaultValue: "Deployment and auth" })}
            </h2>
            <ModeBadge
              deploymentMode={healthQuery.data?.deploymentMode}
              deploymentExposure={healthQuery.data?.deploymentExposure}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {healthQuery.data?.deploymentMode === "local_trusted"
              ? t("settings.general.deployment.localTrusted", {
                  defaultValue:
                    "Local trusted mode is optimized for a local operator. Browser requests run as local board context and no sign-in is required.",
                })
              : healthQuery.data?.deploymentExposure === "public"
                ? t("settings.general.deployment.authenticatedPublic", {
                    defaultValue:
                      "Authenticated public mode requires sign-in for board access and is intended for public URLs.",
                  })
                : t("settings.general.deployment.authenticatedPrivate", {
                    defaultValue:
                      "Authenticated private mode requires sign-in and is intended for LAN, VPN, or other private-network deployments.",
                  })}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <StatusBox
              label={t("settings.general.deployment.authReadiness", { defaultValue: "Auth readiness" })}
              value={
                healthQuery.data?.authReady
                  ? t("settings.general.deployment.ready", { defaultValue: "Ready" })
                  : t("settings.general.deployment.notReady", { defaultValue: "Not ready" })
              }
            />
            <StatusBox
              label={t("settings.general.deployment.bootstrapStatus", { defaultValue: "Bootstrap status" })}
              value={
                healthQuery.data?.bootstrapStatus === "bootstrap_pending"
                  ? t("settings.general.deployment.setupRequired", { defaultValue: "Setup required" })
                  : t("settings.general.deployment.ready", { defaultValue: "Ready" })
              }
            />
            <StatusBox
              label={t("settings.general.deployment.bootstrapInvite", { defaultValue: "Bootstrap invite" })}
              value={
                healthQuery.data?.bootstrapInviteActive
                  ? t("settings.general.deployment.active", { defaultValue: "Active" })
                  : t("settings.general.deployment.none", { defaultValue: "None" })
              }
            />
          </div>
        </div>
      </Card>

      <Card className="block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.general.censorLogs.title", { defaultValue: "Censor username in logs" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.general.censorLogs.description", {
                defaultValue:
                  "Hide the username segment in home-directory paths and similar operator-visible log output. Standalone username mentions outside of paths are not yet masked in the live transcript view. This is off by default.",
              })}
            </p>
          </div>
          <ToggleSwitch
            checked={censorUsernameInLogs}
            onCheckedChange={() => updateGeneralMutation.mutate({ censorUsernameInLogs: !censorUsernameInLogs })}
            disabled={updateGeneralMutation.isPending}
            aria-label={t("settings.general.censorLogs.toggleAria", {
              defaultValue: "Toggle username log censoring",
            })}
          />
        </div>
      </Card>

      <Card className="block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.general.keyboardShortcuts.title", { defaultValue: "Keyboard shortcuts" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.general.keyboardShortcuts.description", {
                defaultValue:
                  "Enable app keyboard shortcuts, including inbox navigation and global shortcuts like creating tasks or toggling panels. This is off by default.",
              })}
            </p>
          </div>
          <ToggleSwitch
            checked={keyboardShortcuts}
            onCheckedChange={() => updateGeneralMutation.mutate({ keyboardShortcuts: !keyboardShortcuts })}
            disabled={updateGeneralMutation.isPending}
            aria-label={t("settings.general.keyboardShortcuts.toggleAria", {
              defaultValue: "Toggle keyboard shortcuts",
            })}
          />
        </div>
      </Card>

      <Card className="block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.general.language.title", { defaultValue: "Language" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.general.language.description", {
                defaultValue:
                  "Choose the display language for this browser. Stored locally, not on the server.",
              })}
            </p>
          </div>
          <Select value={i18n.language} onValueChange={setLocale}>
            <SelectTrigger
              size="sm"
              aria-label={t("settings.general.language.selectAria", { defaultValue: "Select display language" })}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {[...supportedLocales]
                .sort((a, b) => localeDisplayName(a).localeCompare(localeDisplayName(b)))
                .map((code) => (
                  <SelectItem key={code} value={code}>
                    {localeDisplayName(code)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="block p-5">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.general.backupRetention.title", { defaultValue: "Backup retention" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.general.backupRetention.description", {
                defaultValue:
                  "Configure how long automatic database backups are retained. Backups run roughly every hour and are compressed with gzip. Within the daily window all backups are kept; beyond that, one backup per week and one per month are preserved.",
              })}
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("settings.general.backupRetention.daily", { defaultValue: "Daily" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {DAILY_RETENTION_PRESETS.map((days) => {
                const active = backupRetention.dailyDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    disabled={updateGeneralMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, dailyDays: days },
                      })
                    }
                  >
                    <div className="text-sm font-medium">
                      {t("settings.general.backupRetention.days", {
                        defaultValue: "{{count}} days",
                        count: days,
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("settings.general.backupRetention.weekly", { defaultValue: "Weekly" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {WEEKLY_RETENTION_PRESETS.map((weeks) => {
                const active = backupRetention.weeklyWeeks === weeks;
                return (
                  <button
                    key={weeks}
                    type="button"
                    disabled={updateGeneralMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, weeklyWeeks: weeks },
                      })
                    }
                  >
                    <div className="text-sm font-medium">
                      {t("settings.general.backupRetention.weeks", {
                        defaultValue: "{{count}} weeks",
                        count: weeks,
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("settings.general.backupRetention.monthly", { defaultValue: "Monthly" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {MONTHLY_RETENTION_PRESETS.map((months) => {
                const active = backupRetention.monthlyMonths === months;
                return (
                  <button
                    key={months}
                    type="button"
                    disabled={updateGeneralMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, monthlyMonths: months },
                      })
                    }
                  >
                    <div className="text-sm font-medium">
                      {t("settings.general.backupRetention.months", {
                        defaultValue: "{{count}} months",
                        count: months,
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card className="block p-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.general.feedback.title", { defaultValue: "AI feedback sharing" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.general.feedback.description", {
                defaultValue:
                  "Control whether thumbs up and thumbs down votes can send the voted AI output to Paperclip Labs. Votes are always saved locally.",
              })}
            </p>
            {FEEDBACK_TERMS_URL ? (
              <a
                href={FEEDBACK_TERMS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("settings.general.feedback.terms", { defaultValue: "Read our terms of service" })}
              </a>
            ) : null}
          </div>
          {feedbackDataSharingPreference === "prompt" ? (
            <div className="rounded-lg border border-border/70 bg-accent/20 px-3 py-2 text-sm text-muted-foreground">
              {t("settings.general.feedback.promptNotice", {
                defaultValue:
                  "No default is saved yet. The next thumbs up or thumbs down choice will ask once and then save the answer here.",
              })}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {[
              {
                value: "allowed",
                label: t("settings.general.feedback.allowLabel", { defaultValue: "Always allow" }),
                description: t("settings.general.feedback.allowDescription", {
                  defaultValue: "Share voted AI outputs automatically.",
                }),
              },
              {
                value: "not_allowed",
                label: t("settings.general.feedback.denyLabel", { defaultValue: "Don't allow" }),
                description: t("settings.general.feedback.denyDescription", {
                  defaultValue: "Keep voted AI outputs local only.",
                }),
              },
            ].map((option) => {
              const active = feedbackDataSharingPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={updateGeneralMutation.isPending}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border bg-background hover:bg-accent/50",
                  )}
                  onClick={() =>
                    updateGeneralMutation.mutate({
                      feedbackDataSharingPreference: option.value as
                        | "allowed"
                        | "not_allowed",
                    })
                  }
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Developer-facing note; intentionally not localized. */}
          <p className="text-xs text-muted-foreground">
            To retest the first-use prompt in local dev, remove the{" "}
            <code>feedbackDataSharingPreference</code> key from the{" "}
            <code>instance_settings.general</code> JSON row for this instance, or set it back to{" "}
            <code>"prompt"</code>. Unset and <code>"prompt"</code> both mean no default has been
            chosen yet.
          </p>
        </div>
      </Card>

      <Card className="block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("settings.general.signOut.title", { defaultValue: "Sign out" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.general.signOut.description", {
                defaultValue: "Sign out of this Paperclip instance. You will be redirected to the login page.",
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={signOutMutation.isPending}
            onClick={() => signOutMutation.mutate()}
          >
            <LogOut className="size-4" />
            {signOutMutation.isPending
              ? t("settings.general.signOut.pending", { defaultValue: "Signing out..." })
              : t("settings.general.signOut.action", { defaultValue: "Sign out" })}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
