"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { CalendarDate } from "@internationalized/date";
import { Calendar, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { DatePicker } from "@/components/base/date-picker/date-picker";
import { Input } from "@/components/base/input/input";
import { Textarea } from "@/components/base/textarea/textarea";
import { cx } from "@/utils/cx";
import {
  BackendError,
  changePassword,
  updateProfile,
  type CurrentUser,
  type ProfileUpdate,
} from "@/lib/api";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
  SettingsValueField,
} from "./settings-rows";

/**
 * Figma source: Board UI → "Settings/Profile" (node 4081:13943), the right
 * pane of the settings modal.
 *
 * The fields are wired to the signed-in account: every edit is saved through
 * `PATCH /auth/me` (see lib/api.ts) and the refreshed user is lifted back to
 * the dashboard so the sidebar and greeting update immediately.
 *
 *   1. identity   Email / First name / Last name / Date of birth / Bio
 *   2. security   Change password (current + new)
 *   3. account    Member since / Sign out
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatBirthDate(date: CalendarDate) {
  return `${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
}

function parseDate(value: string | null): CalendarDate | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new CalendarDate(year, month, day);
}

function formatMemberSince(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

/**
 * Design-system Input that commits on Enter / blur. Enter just blurs the
 * field, and blur fires the save only when the value actually changed since
 * the last successful commit — so clicking in and out without typing stays
 * silent. Failures keep the typed value and show the server's message.
 */
function SavableInput({
  initialValue,
  onCommit,
  onSaved,
  ...inputProps
}: {
  initialValue: string;
  onCommit: (value: string) => Promise<void>;
  onSaved?: () => void;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue">) {
  const localize = useTemplateCopy();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const committed = useRef(initialValue);

  useEffect(() => {
    committed.current = initialValue;
    setValue(initialValue);
  }, [initialValue]);

  async function commit() {
    const next = value.trim();
    if (next === committed.current) return;

    setSaving(true);
    setError("");
    try {
      await onCommit(next);
      committed.current = next;
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof BackendError ? saveError.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return localize((
    <div className="flex w-[202px] shrink-0 flex-col items-end gap-1">
      <Input
        size="small"
        {...inputProps}
        value={value}
        isDisabled={saving || inputProps.isDisabled}
        onChange={setValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLElement).blur();
        }}
        onBlur={commit}
        className={cx("w-full", inputProps.className)}
      />
      {error && (
        <p role="alert" className="text-end text-caption-2-regular text-text-error-primary">
          {error}
        </p>
      )}
    </div>
  ));
}

function SettingsProfileImpl({
  user,
  onUserUpdated,
  onSaved,
  onSignOut,
  signingOut,
}: {
  user: CurrentUser;
  onUserUpdated?: (user: CurrentUser) => void;
  onSaved?: () => void;
  onSignOut?: () => void;
  signingOut?: boolean;
}) {
  const localize = useTemplateCopy();
  const [birthDate, setBirthDate] = useState<CalendarDate | null>(parseDate(user.dateOfBirth));
  const [birthOpen, setBirthOpen] = useState(false);
  const [birthSaving, setBirthSaving] = useState(false);
  const [birthError, setBirthError] = useState("");
  const birthTriggerRef = useRef<HTMLButtonElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    setBirthDate(parseDate(user.dateOfBirth));
  }, [user.dateOfBirth]);

  async function saveProfile(update: ProfileUpdate) {
    const updated = await updateProfile(update);
    onUserUpdated?.(updated);
    return updated;
  }

  async function saveBirthDate(next: CalendarDate | null) {
    const previous = birthDate;
    setBirthDate(next);
    setBirthOpen(false);
    setBirthSaving(true);
    setBirthError("");
    try {
      await saveProfile({ dateOfBirth: next ? next.toString() : null });
      onSaved?.();
    } catch (saveError) {
      setBirthDate(previous);
      setBirthError(saveError instanceof BackendError ? saveError.message : "Could not save. Try again.");
    } finally {
      setBirthSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated.");
      onSaved?.();
    } catch (saveError) {
      setPasswordError(saveError instanceof BackendError ? saveError.message : "Could not update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const passwordReady = currentPassword.length > 0 && newPassword.length >= 8;

  return localize((
    <div className="flex w-full flex-col gap-6">
      <SettingsCard>
        <SettingsRow label="Email">
          <SavableInput
            aria-label="Email"
            type="email"
            leadingIcon={Mail}
            initialValue={user.email}
            onCommit={async (value) => {
              await saveProfile({ email: value });
            }}
            onSaved={onSaved}
          />
        </SettingsRow>
        <SettingsRow label="First name">
          <SavableInput
            aria-label="First name"
            initialValue={user.firstName ?? ""}
            placeholder="Add first name"
            onCommit={async (value) => {
              await saveProfile({ firstName: value });
            }}
            onSaved={onSaved}
          />
        </SettingsRow>
        <SettingsRow label="Last name">
          <SavableInput
            aria-label="Last name"
            initialValue={user.lastName ?? ""}
            placeholder="Add last name"
            onCommit={async (value) => {
              await saveProfile({ lastName: value });
            }}
            onSaved={onSaved}
          />
        </SettingsRow>
        <SettingsRow label="Date of birth">
          <div className="flex w-[202px] shrink-0 flex-col items-end gap-1">
            <button
              ref={birthTriggerRef}
              type="button"
              disabled={birthSaving}
              onClick={() => setBirthOpen((open) => !open)}
              className={[
                "flex h-8 w-full cursor-pointer items-center gap-0.5 rounded-lg px-2",
                "border border-border-button-default bg-background-primary-default shadow-xs",
                "transition-colors duration-150 ease hover:bg-background-primary-hover",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                birthSaving ? "opacity-60" : "",
              ].join(" ")}
            >
              <Calendar className="size-[18px] shrink-0 text-foreground-icon-primary" aria-hidden />
              <span
                className={cx(
                  "truncate px-0.5 text-body-regular whitespace-nowrap",
                  birthDate ? "text-text-primary" : "text-text-placeholder",
                )}
              >
                {birthDate ? formatBirthDate(birthDate) : "Add date of birth"}
              </span>
            </button>
            {birthError && (
              <p role="alert" className="text-end text-caption-2-regular text-text-error-primary">
                {birthError}
              </p>
            )}
          </div>
          <DatePicker
            aria-label="Date of birth"
            triggerRef={birthTriggerRef}
            isOpen={birthOpen}
            onOpenChange={setBirthOpen}
            value={birthDate}
            onChange={saveBirthDate}
          />
        </SettingsRow>
        <SettingsRow label="Bio" description="A short line about you">
          <SavableTextarea
            aria-label="Bio"
            initialValue={user.bio ?? ""}
            placeholder="Say a little about yourself"
            onCommit={async (value) => {
              await saveProfile({ bio: value });
            }}
            onSaved={onSaved}
          />
        </SettingsRow>
      </SettingsCard>

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Security</SettingsSectionLabel>
        <SettingsCard>
          <div className="flex w-full flex-col gap-3 py-3 pe-2.5">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col">
                <p className="text-body-regular text-text-primary">Change password</p>
                <p className="text-body-2-regular text-text-secondary">
                  Use at least 8 characters.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-[220px] sm:shrink-0">
                <Input
                  aria-label="Current password"
                  size="small"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <Input
                  aria-label="New password"
                  size="small"
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <Button
                  size="small"
                  variant="secondary"
                  leadingIcon={ShieldCheck}
                  disabled={!passwordReady || passwordSaving}
                  onClick={handlePasswordChange}
                >
                  {passwordSaving ? "Updating..." : "Update password"}
                </Button>
                {passwordError && (
                  <p role="alert" className="text-end text-caption-2-regular text-text-error-primary">
                    {passwordError}
                  </p>
                )}
                {passwordMessage && (
                  <p aria-live="polite" className="text-end text-caption-2-regular text-text-secondary">
                    {passwordMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Account</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Member since">
            <SettingsValueField muted>{formatMemberSince(user.createdAt)}</SettingsValueField>
          </SettingsRow>
          <SettingsRow label="Sign out" description="End this session on this device">
            <Button
              variant="secondary"
              size="small"
              leadingIcon={LogOut}
              onClick={onSignOut}
              disabled={!onSignOut || signingOut}
            >
              Logout
            </Button>
          </SettingsRow>
        </SettingsCard>
      </div>
    </div>
  ));
}

function SavableTextarea({
  initialValue,
  onCommit,
  onSaved,
  ...textareaProps
}: {
  initialValue: string;
  onCommit: (value: string) => Promise<void>;
  onSaved?: () => void;
} & Omit<ComponentProps<typeof Textarea>, "value" | "onChange" | "defaultValue">) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const committed = useRef(initialValue);

  useEffect(() => {
    committed.current = initialValue;
    setValue(initialValue);
  }, [initialValue]);

  async function commit() {
    const next = value.trim();
    if (next === committed.current) return;

    setSaving(true);
    setError("");
    try {
      await onCommit(next);
      committed.current = next;
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof BackendError ? saveError.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-[202px] shrink-0 flex-col items-end gap-1">
      <Textarea
        {...textareaProps}
        rows={3}
        value={value}
        isDisabled={saving || textareaProps.isDisabled}
        onChange={setValue}
        onBlur={commit}
        className="w-full"
      />
      {error && (
        <p role="alert" className="text-end text-caption-2-regular text-text-error-primary">
          {error}
        </p>
      )}
    </div>
  );
}

export function SettingsProfile(props: {
  user: CurrentUser;
  onUserUpdated?: (user: CurrentUser) => void;
  onSaved?: () => void;
  onSignOut?: () => void;
  signingOut?: boolean;
}) {
  return <SettingsProfileImpl {...props} />;
}
