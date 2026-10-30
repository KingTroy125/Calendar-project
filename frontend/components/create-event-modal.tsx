'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { parseDate, type CalendarDate } from '@internationalized/date'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { DatePicker } from '@/components/base/date-picker/date-picker'
import { IconButton } from '@/components/base/buttons/icon-button'
import { Input } from '@/components/base/input/input'
import { Textarea } from '@/components/base/textarea/textarea'
import type { CalendarEvent, CalendarEventColor, NewCalendarEvent } from '@/lib/api'
import { cx } from '@/utils/cx'

const EVENT_COLORS: CalendarEventColor[] = ['blue', 'green', 'pink', 'purple', 'amber']

const COLOR_STYLES: Record<CalendarEventColor, string> = {
  blue: 'bg-accent-50 text-accent-700',
  green: 'bg-status-lime-background text-status-lime-text',
  pink: 'bg-status-rose-background text-status-rose-text',
  purple: 'bg-chart-1/15 text-chart-1',
  amber: 'bg-chart-2/15 text-chart-2',
}

const COLOR_DOT_STYLES: Record<CalendarEventColor, string> = {
  blue: 'bg-accent-600',
  green: 'bg-status-lime-text',
  pink: 'bg-status-rose-text',
  purple: 'bg-chart-1',
  amber: 'bg-chart-2',
}

export function CreateEventModal({
  isOpen,
  onOpenChange,
  initialDate,
  event,
  defaultEventDuration = 60,
  onSaveEvent,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialDate: CalendarDate
  event?: CalendarEvent | null
  /** Minutes used to pre-fill the end time of a new timed event. */
  defaultEventDuration?: number
  onSaveEvent: (event: NewCalendarEvent) => Promise<void>
}) {
  const isEditing = Boolean(event)
  const [draftDate, setDraftDate] = useState<CalendarDate>(initialDate)
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState<CalendarEventColor>('blue')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // A new event opens as 09:00 → 09:00 + the saved default length; editing
  // keeps whatever the event already has.
  const defaultStartTime = event?.startTime ?? '09:00'
  const defaultEndTime = event?.endTime ?? addMinutes(defaultStartTime, defaultEventDuration)

  useEffect(() => {
    if (!isOpen) return
    setDraftDate(event ? parseDate(event.date) : initialDate)
    setAllDay(event?.allDay ?? false)
    setColor(event?.color ?? 'blue')
    setFormError('')
    setSaving(false)
  }, [isOpen, initialDate, event])

  function close() {
    onOpenChange(false)
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const formData = new FormData(formEvent.currentTarget)
    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const startTime = allDay ? null : String(formData.get('startTime') ?? '09:00')
    const endTime = allDay ? null : String(formData.get('endTime') ?? '10:00')

    if (!title) {
      setFormError('Please enter a title for the event.')
      return
    }
    if (!allDay && startTime && endTime && minutes(endTime) <= minutes(startTime)) {
      setFormError('End time must be after start time.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await onSaveEvent({
        title,
        description: description || null,
        date: draftDate.toString(),
        startTime,
        endTime,
        allDay,
        color,
      })
      close()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      isDismissable
      className={({ isEntering, isExiting }) => cx(
        'fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-text-primary/30 p-4 backdrop-blur-sm',
        isEntering && 'animate-in fade-in duration-150',
        isExiting && 'animate-out fade-out duration-100',
      )}
    >
      <Modal className="w-full max-w-md outline-none">
        <Dialog
          aria-label={isEditing ? 'Edit event' : 'Create event'}
          className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xl sm:p-6"
        >
          <form
            key={`${event?.id ?? 'new'}-${isOpen ? 'open' : 'closed'}`}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-title-3-semibold text-text-primary">
                  {isEditing ? 'Edit event' : 'New event'}
                </h3>
                <p className="mt-1 text-body-regular text-text-secondary">
                  {isEditing ? 'Update the details below.' : 'Fill in the details below.'}
                </p>
              </div>
              <IconButton
                icon={X}
                size="small"
                aria-label="Close event dialog"
                onClick={close}
              />
            </div>

            <Input
              name="title"
              label="Event title"
              placeholder="Planning session"
              defaultValue={event?.title ?? ''}
              isRequired
              autoFocus
            />

            <Textarea
              name="description"
              label="Description"
              placeholder="Add notes or details (optional)"
              defaultValue={event?.description ?? ''}
              rows={3}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-caption-1-semibold text-text-primary">Date</span>
              <DatePicker value={draftDate} onChange={(date) => date && setDraftDate(date)} aria-label="Event date" />
            </div>

            <Checkbox isSelected={allDay} onChange={setAllDay}>All day</Checkbox>

            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <Input name="startTime" label="Starts" type="time" defaultValue={defaultStartTime} isRequired />
                <Input name="endTime" label="Ends" type="time" defaultValue={defaultEndTime} isRequired />
              </div>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className="text-caption-1-semibold text-text-primary">Color</legend>
              <div className="flex items-center gap-2">
                {EVENT_COLORS.map((eventColor) => (
                  <button
                    key={eventColor}
                    type="button"
                    aria-label={`${eventColor} event color`}
                    aria-pressed={color === eventColor}
                    onClick={() => setColor(eventColor)}
                    className={cx(
                      'flex size-7 items-center justify-center rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                      COLOR_STYLES[eventColor],
                      color === eventColor && 'ring-2 ring-border-focus-ring ring-offset-2',
                    )}
                  >
                    <span className={cx('size-3 rounded-full', COLOR_DOT_STYLES[eventColor])} />
                  </button>
                ))}
              </div>
            </fieldset>

            {formError && <p role="alert" className="text-body-regular text-text-error-primary">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} leadingIcon={isEditing ? Check : Plus}>
                {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Save event'}
              </Button>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function minutes(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  return hour * 60 + minute
}

/** "09:00" + 90 → "10:30", clamped to the end of the day. */
function addMinutes(time: string, amount: number) {
  const total = Math.min(minutes(time) + amount, 23 * 60 + 59)
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
