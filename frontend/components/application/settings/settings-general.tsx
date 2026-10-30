"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useState } from "react";
import { LogOut, Pencil } from "lucide-react";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import {
  BackendError,
  displayName,
  updateProfile,
  type CurrentUser,
  type WeekStartsOn,
} from "@/lib/api";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";

/**
 * The General page of the settings modal — the calendar app's own preferences.
 *
 *   1. account    who is signed in, a shortcut to the Profile page, sign out
 *   2. appearance light / dark theme
 *   3. calendar   week start + default event length, persisted on the User
 *
 * The calendar preferences are saved through `PATCH /auth/me` and lifted back
 * to the dashboard, so the month grid, weekly strip and new-event defaults
 * change as soon as the select closes.
 */

/** Compact white select trigger (h 32, radius/lg) per the settings rows. */
const SELECT_TRIGGER = "h-8 min-w-40 gap-1 rounded-lg px-2 py-1.5";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
  return rest ? `${hourLabel} ${rest} minutes` : hourLabel;
}

function initialsFor(user: CurrentUser) {
  const name = displayName(user);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase() || "?";
}

export function SettingsGeneral({
  user,
  onUserUpdated,
  onSaved,
  onSignOut,
  signingOut = false,
  onOpenProfile,
}: {
  user: CurrentUser;
  onUserUpdated?: (user: CurrentUser) => void;
  onSaved?: () => void;
  onSignOut?: () => void;
  signingOut?: boolean;
  /** Switches the modal to the Profile page. */
  onOpenProfile?: () => void;
}) {
  const localize = useTemplateCopy();

  // Seeded from the signed-in user; the modal remounts each time it opens.
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(user.weekStartsOn);
  const [defaultEventDuration, setDefaultEventDuration] = useState(user.defaultEventDuration);
  const [savingPreference, setSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");

  async function savePreference(update: {
    weekStartsOn?: WeekStartsOn;
    defaultEventDuration?: number;
  }) {
    const previousWeekStart = weekStartsOn;
    const previousDuration = defaultEventDuration;

    if (update.weekStartsOn) setWeekStartsOn(update.weekStartsOn);
    if (update.defaultEventDuration) setDefaultEventDuration(update.defaultEventDuration);
    setSavingPreference(true);
    setPreferenceError("");

    try {
      const updated = await updateProfile(update);
      onUserUpdated?.(updated);
      onSaved?.();
    } catch (error) {
      setWeekStartsOn(previousWeekStart);
      setDefaultEventDuration(previousDuration);
      setPreferenceError(
        error instanceof BackendError ? error.message : "Could not save this preference.",
      );
    } finally {
      setSavingPreference(false);
    }
  }

  const durationOptions = Array.from(
    new Set([...DURATION_OPTIONS, defaultEventDuration]),
  ).sort((a, b) => a - b);

  return localize((
    <div className="flex w-full flex-col gap-6">
      {/* Account */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Account</SettingsSectionLabel>
        <SettingsCard>
          <div className="flex min-h-[64px] w-full items-center justify-between gap-4 border-b border-separator-border py-2.5 pe-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar size="lg" color="blue" initials={initialsFor(user)} />
              <div className="min-w-0">
                <p className="truncate text-body-medium text-text-primary">{displayName(user)}</p>
                <p className="truncate text-body-2-regular text-text-secondary">{user.email}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="small"
              leadingIcon={Pencil}
              onClick={onOpenProfile}
              disabled={!onOpenProfile}
            >
              Edit profile
            </Button>
          </div>
          <SettingsRow label="Sign out" description="End this session on this device">
            <Button
              variant="secondary"
              size="small"
              leadingIcon={LogOut}
              onClick={onSignOut}
              disabled={!onSignOut || signingOut}
            >
              {signingOut ? "Signing out..." : "Logout"}
            </Button>
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Appearance */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Appearance</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Theme" description="Use light or dark mode across the app">
            <ThemeToggle appearance="segmented" size="small" />
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Calendar */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Calendar</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Week starts on" description="First day of the week and month grid">
            <Select
              aria-label="Week starts on"
              selectedKey={weekStartsOn}
              onSelectionChange={(key) => {
                if (key && key !== weekStartsOn) {
                  void savePreference({ weekStartsOn: key as WeekStartsOn });
                }
              }}
              isDisabled={savingPreference}
              triggerClassName={SELECT_TRIGGER}
            >
              <SelectItem id="monday">Monday</SelectItem>
              <SelectItem id="sunday">Sunday</SelectItem>
            </Select>
          </SettingsRow>
          <SettingsRow
            label="Default event length"
            description="Pre-filled end time for new events"
          >
            <Select
              aria-label="Default event length"
              selectedKey={String(defaultEventDuration)}
              onSelectionChange={(key) => {
                const minutes = Number(key);
                if (key && minutes && minutes !== defaultEventDuration) {
                  void savePreference({ defaultEventDuration: minutes });
                }
              }}
              isDisabled={savingPreference}
              triggerClassName={SELECT_TRIGGER}
            >
              {durationOptions.map((minutes) => (
                <SelectItem key={minutes} id={String(minutes)}>
                  {durationLabel(minutes)}
                </SelectItem>
              ))}
            </Select>
          </SettingsRow>
        </SettingsCard>
        {preferenceError && (
          <p role="alert" className={cx("px-3 text-body-2-regular text-text-error-primary")}>
            {preferenceError}
          </p>
        )}
      </div>
    </div>
  ));
}
