'use client'

import { useState } from 'react'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import {
  X,
  Calendar,
  Clock,
  AlignLeft,
  Pencil,
  Tag,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/base/buttons/button'
import { IconButton } from '@/components/base/buttons/icon-button'
import { Spinner } from '@/components/base/spinner/spinner'
import { BackendError, type CalendarEvent, type CalendarEventColor } from '@/lib/api'
import { cx } from '@/utils/cx'

const EVENT_ACCENT_BAR: Record<CalendarEventColor, string> = {
  blue: 'bg-accent-600',
  green: 'bg-status-lime-text',
  pink: 'bg-status-rose-text',
  purple: 'bg-chart-1',
  amber: 'bg-chart-2',
}

const EVENT_CHIP_STYLES: Record<CalendarEventColor, string> = {
  blue: 'bg-accent-50 text-accent-700',
  green: 'bg-status-lime-background text-status-lime-text',
  pink: 'bg-status-rose-background text-status-rose-text',
  purple: 'bg-chart-1/15 text-chart-1',
  amber: 'bg-chart-2/15 text-chart-2',
}

const EVENT_DOT_STYLES: Record<CalendarEventColor, string> = {
  blue: 'bg-accent-600',
  green: 'bg-status-lime-text',
  pink: 'bg-status-rose-text',
  purple: 'bg-chart-1',
  amber: 'bg-chart-2',
}

const COLOR_LABELS: Record<CalendarEventColor, string> = {
  blue: 'Blue',
  green: 'Green',
  pink: 'Pink',
  purple: 'Purple',
  amber: 'Amber',
}

function formatTime(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2020, 0, 1, hour, minute),
  )
}

function formatFullDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-secondary"
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-semibold text-text-tertiary">{label}</p>
        <div className="mt-0.5 text-body-medium text-text-primary">{children}</div>
      </div>
    </div>
  )
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => Promise<void>
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  if (!event) return null

  function handleClose() {
    setConfirmingDelete(false)
    setDeleteError('')
    onClose()
  }

  async function handleDelete() {
    if (!event || !onDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await onDelete(event)
    } catch (error) {
      setDeleteError(
        error instanceof BackendError ? error.message : 'Unable to delete this event. Please try again.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const timeLabel = event.allDay
    ? 'All day'
    : event.startTime && event.endTime
      ? `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
      : null

  const durationMins =
    !event.allDay && event.startTime && event.endTime
      ? (() => {
          const [sh = 0, sm = 0] = event.startTime.split(':').map(Number)
          const [eh = 0, em = 0] = event.endTime.split(':').map(Number)
          return eh * 60 + em - (sh * 60 + sm)
        })()
      : null

  const durationLabel =
    durationMins !== null
      ? durationMins >= 60
        ? `${Math.floor(durationMins / 60)}h${durationMins % 60 ? ` ${durationMins % 60}m` : ''}`
        : `${durationMins}m`
      : null

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose() }}
      isDismissable
      className={({ isEntering, isExiting }) =>
        cx(
          'fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-text-primary/30 p-4 backdrop-blur-sm',
          isEntering && 'animate-in fade-in duration-200',
          isExiting && 'animate-out fade-out duration-150',
        )
      }
    >
      <Modal
        className={({ isEntering, isExiting }) =>
          cx(
            'w-full max-w-md outline-none',
            isEntering && 'animate-in zoom-in-95 slide-in-from-bottom-2 duration-200',
            isExiting && 'animate-out zoom-out-95 slide-out-to-bottom-2 duration-150',
          )
        }
      >
        <Dialog
          aria-label={`Event details: ${event.title}`}
          className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-xl outline-none"
        >
          {/* Color accent bar */}
          <div className={cx('h-1.5 w-full', EVENT_ACCENT_BAR[event.color])} />

          <div className="flex flex-col gap-5 p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cx('size-2.5 shrink-0 rounded-full', EVENT_DOT_STYLES[event.color])}
                    aria-hidden
                  />
                  <span
                    className={cx(
                      'rounded-full px-2.5 py-0.5 text-caption-1-semibold',
                      EVENT_CHIP_STYLES[event.color],
                    )}
                  >
                    {event.allDay ? 'All day' : 'Event'}
                  </span>
                </div>
                <h2 className="mt-3 text-title-3-semibold text-text-primary">{event.title}</h2>
              </div>
              <IconButton
                icon={X}
                size="small"
                aria-label="Close event details"
                onClick={onClose}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-separator-border" />

            {/* Detail rows */}
            <div className="flex flex-col gap-4">
              <DetailRow icon={Calendar} label="Date">
                {formatFullDate(event.date)}
              </DetailRow>

              {timeLabel && (
                <DetailRow icon={Clock} label="Time">
                  <span>{timeLabel}</span>
                  {durationLabel && (
                    <span className="ms-2 text-caption-1-regular text-text-tertiary">
                      ({durationLabel})
                    </span>
                  )}
                </DetailRow>
              )}

              <DetailRow icon={Tag} label="Color">
                <div className="flex items-center gap-2">
                  <span
                    className={cx('size-3 rounded-full', EVENT_DOT_STYLES[event.color])}
                    aria-hidden
                  />
                  {COLOR_LABELS[event.color]}
                </div>
              </DetailRow>

              {event.description && (
                <DetailRow icon={AlignLeft} label="Notes">
                  <p className="whitespace-pre-wrap text-body-regular text-text-secondary">
                    {event.description}
                  </p>
                </DetailRow>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-separator-border pt-4">
              {deleteError && (
                <p role="alert" className="flex items-center gap-2 text-body-2-regular text-text-error-primary">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  {deleteError}
                </p>
              )}

              {confirmingDelete ? (
                // ── Delete confirmation ──
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 rounded-2xl bg-status-rose-background px-4 py-3">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-rose-text" aria-hidden />
                    <div>
                      <p className="text-body-medium text-status-rose-text">Delete this event?</p>
                      <p className="mt-0.5 text-caption-1-regular text-text-secondary">
                        &ldquo;{event.title}&rdquo; will be permanently removed. This can&apos;t be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      leadingIcon={deleting ? undefined : Trash2}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <span className="flex items-center gap-2">
                          <Spinner size="sm" /> Deleting…
                        </span>
                      ) : (
                        'Delete event'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="danger"
                    leadingIcon={Trash2}
                    onClick={() => setConfirmingDelete(true)}
                    disabled={!onDelete}
                  >
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleClose}>
                      Close
                    </Button>
                    <Button leadingIcon={Pencil} onClick={() => onEdit(event)}>
                      Edit event
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
