'use client'

import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { getLocalTimeZone, today, type CalendarDate } from '@internationalized/date'
import { Button as AriaButton, Dialog, DialogTrigger, Modal, ModalOverlay, Popover } from 'react-aria-components'
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  X,
  AlignLeft,
  Clock,
  Globe,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { DatePicker } from '@/components/base/date-picker/date-picker'
import { IconButton } from '@/components/base/buttons/icon-button'
import { Input } from '@/components/base/input/input'
import { Textarea } from '@/components/base/textarea/textarea'
import type { CalendarEvent, CalendarEventColor, NewCalendarEvent } from '@/lib/api'
import { cx } from '@/utils/cx'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EVENT_STYLES: Record<CalendarEventColor, string> = {
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

function dateKey(date: CalendarDate) {
  return date.toString()
}

function addDays(date: CalendarDate, amount: number) {
  return date.add({ days: amount })
}

function startOfWeek(date: CalendarDate) {
  return date.subtract({ days: date.toDate(getLocalTimeZone()).getDay() })
}

function monthGrid(date: CalendarDate) {
  const firstOfMonth = date.set({ day: 1 })
  const start = startOfWeek(firstOfMonth)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

function formatDate(date: CalendarDate, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options).format(date.toDate(getLocalTimeZone()))
}

const COLOR_LABELS: Record<CalendarEventColor, string> = {
  blue: 'Blue',
  green: 'Green',
  pink: 'Pink',
  purple: 'Purple',
  amber: 'Amber',
}

function shortDateLabel(dateStr: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${dateStr}T12:00:00`))
}

function eventDuration(event: CalendarEvent) {
  if (event.allDay || !event.startTime || !event.endTime) return null
  const [startHour = 0, startMinute = 0] = event.startTime.split(':').map(Number)
  const [endHour = 0, endMinute = 0] = event.endTime.split(':').map(Number)
  const total = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (total <= 0) return null
  if (total < 60) return `${total}m`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function localTimezoneLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const city = timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone
  const offset =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? ''
  return [offset, city].filter(Boolean).join(' ')
}

function DetailRow({
  icon: Icon,
  align = 'center',
  trailing,
  children,
}: {
  icon: LucideIcon
  align?: 'center' | 'start'
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={cx(
        'flex gap-2.5 rounded-2xl bg-background-secondary-default px-3 py-2.5',
        align === 'start' ? 'items-start' : 'items-center',
      )}
    >
      <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
      <div className="min-w-0 flex-1 text-body-regular text-text-primary">{children}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}

function EventDetailsTrigger({
  event,
  className,
  style,
  children,
}: {
  event: CalendarEvent
  className: string
  style?: CSSProperties
  children: ReactNode
}) {
  const duration = eventDuration(event)

  return (
    <DialogTrigger>
      <AriaButton style={style} className={className}>
        {children}
      </AriaButton>
      <Popover
        placement="right top"
        className="z-50 w-[min(340px,calc(100vw-32px))] rounded-3xl border border-border-button-default bg-background-primary-default p-2.5 shadow-xl outline-none"
      >
        <Dialog aria-label={`Event details: ${event.title}`} className="flex flex-col gap-2 outline-none">
          <div className="rounded-2xl bg-background-secondary-default px-3.5 py-3">
            <div className="flex items-center gap-2">
              <span className={cx('size-2 shrink-0 rounded-full', EVENT_DOT_STYLES[event.color])} aria-hidden />
              <span className={cx('rounded-full px-2 py-0.5 text-caption-2-medium', EVENT_STYLES[event.color])}>
                {COLOR_LABELS[event.color]}
              </span>
            </div>
            <h3 className="mt-2 truncate text-title-3-semibold text-text-primary">{event.title}</h3>
            <p className="mt-0.5 text-body-regular text-text-secondary">{shortDateLabel(event.date)}</p>
          </div>

          <DetailRow
            icon={Clock}
            trailing={
              duration ? (
                <span className="rounded-lg bg-background-tertiary-default px-2 py-1 text-caption-1-medium tabular-nums text-text-secondary">
                  {duration}
                </span>
              ) : undefined
            }
          >
            {!event.allDay && event.startTime && event.endTime ? (
              <span className="flex items-center gap-2 tabular-nums">
                <span>{event.startTime}</span>
                <ArrowRight className="size-3.5 shrink-0 text-foreground-icon-tertiary" aria-hidden />
                <span>{event.endTime}</span>
              </span>
            ) : (
              'All day'
            )}
          </DetailRow>

          <DetailRow icon={Globe}>{localTimezoneLabel(event.date)}</DetailRow>

          <DetailRow
            icon={Tag}
            trailing={<span className={cx('block size-3 rounded-full', EVENT_DOT_STYLES[event.color])} aria-hidden />}
          >
            {COLOR_LABELS[event.color]}
          </DetailRow>

          {event.description && (
            <DetailRow icon={AlignLeft} align="start">
              <p className="whitespace-pre-wrap text-body-regular text-text-secondary">{event.description}</p>
            </DetailRow>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}

function MonthGrid({
  date,
  events,
  onSelectDate,
}: {
  date: CalendarDate
  events: CalendarEvent[]
  onSelectDate: (date: CalendarDate) => void
}) {
  const cells = monthGrid(date)
  const todayKey = dateKey(today(getLocalTimeZone()))

  return (
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default p-1.5 sm:p-2.5">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 pb-1 text-center text-caption-1-medium text-text-secondary">
            <span className="sm:hidden">{day.slice(0, 1)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((cell) => {
          const key = dateKey(cell)
          const inMonth = cell.month === date.month
          const isToday = key === todayKey
          const dayEvents = events.filter((event) => event.date === key)
          const visibleEvents = dayEvents.slice(0, 4)
          const hiddenCount = dayEvents.length - visibleEvents.length

          return (
            <div
              key={key}
              className={cx(
                'flex min-h-24 min-w-0 flex-col rounded-xl border p-1.5 sm:min-h-32 sm:p-2.5 lg:min-h-36',
                inMonth
                  ? 'border-border-button-default bg-background-primary-default'
                  : 'border-transparent bg-background-secondary-default',
                isToday && 'border-accent-600 shadow-xs',
              )}
            >
              <div className="flex min-w-0 items-center justify-between gap-1">
                <button
                  type="button"
                  aria-label={formatDate(cell, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  aria-pressed={key === dateKey(date)}
                  onClick={() => onSelectDate(cell)}
                  className={cx(
                    'flex size-7 shrink-0 items-center justify-center self-start rounded-full text-caption-1-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                    isToday ? 'bg-accent-600 text-text-white' : inMonth ? 'text-text-primary hover:bg-background-secondary-hover' : 'text-text-tertiary',
                  )}
                >
                  {cell.day}
                </button>
              </div>
              <div className="mt-auto flex min-w-0 flex-col gap-1 pt-1">
                {visibleEvents.map((event) => (
                  <EventDetailsTrigger
                    key={event.id}
                    event={event}
                    className={cx('flex min-w-0 items-center justify-between gap-1 rounded-md px-1.5 py-0.5 text-start text-caption-2-medium', EVENT_STYLES[event.color])}
                  >
                    <span className="min-w-0 truncate">{event.title}</span>
                    {!event.allDay && (
                      <span className="shrink-0 tabular-nums opacity-70">{event.startTime}</span>
                    )}
                  </EventDetailsTrigger>
                ))}
                {hiddenCount > 0 && (
                  <span className="truncate px-1.5 text-caption-2-regular text-text-tertiary">
                    +{hiddenCount} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarView({
  currentDate,
  onDateChange,
  events,
  onCreateEvent,
  eventsLoading = false,
  eventsError = '',
}: {
  currentDate: CalendarDate
  onDateChange: (date: CalendarDate) => void
  events: CalendarEvent[]
  onCreateEvent: (event: NewCalendarEvent) => Promise<CalendarEvent>
  eventsLoading?: boolean
  eventsError?: string
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draftDate, setDraftDate] = useState(currentDate)
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState<CalendarEventColor>('blue')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const dateTriggerRef = useRef<HTMLButtonElement>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const monthName = formatDate(currentDate, { month: 'long', year: 'numeric' })

  function shiftPeriod(direction: number) {
    onDateChange(currentDate.set({ day: 1 }).add({ months: direction }))
  }

  async function handleCreateEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const formData = new FormData(formEvent.currentTarget)
    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const startTime = allDay ? null : String(formData.get('startTime') ?? '09:00')
    const endTime = allDay ? null : String(formData.get('endTime') ?? '10:00')

    if (!title) return
    if (!allDay && startTime && endTime && minutes(endTime) <= minutes(startTime)) {
      setFormError('End time must be after start time.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await onCreateEvent({
        title,
        description: description || null,
        date: dateKey(draftDate),
        startTime,
        endTime,
        allDay,
        color,
      })
      onDateChange(draftDate)
      setDialogOpen(false)
      setAllDay(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="calendar" className="scroll-mt-8 flex flex-col gap-4">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0">
          <h1 className="text-title-2-medium text-text-primary">{monthName}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-1">
            <IconButton icon={ArrowLeft} size="small" aria-label="Previous month" onClick={() => shiftPeriod(-1)} />
            <button
              ref={dateTriggerRef}
              type="button"
              aria-label={`Choose date, ${monthName}`}
              aria-expanded={datePickerOpen}
              onClick={() => setDatePickerOpen((open) => !open)}
              className="min-w-36 rounded-lg px-3 py-1.5 text-center text-body-medium text-text-primary outline-none hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              {monthName}
            </button>
            <IconButton icon={ArrowRight} size="small" aria-label="Next month" onClick={() => shiftPeriod(1)} />
          </div>

          <DatePicker
            triggerRef={dateTriggerRef}
            isOpen={datePickerOpen}
            onOpenChange={setDatePickerOpen}
            value={currentDate}
            onChange={(date) => date && onDateChange(date)}
            aria-label="Choose calendar date"
          />

          <DialogTrigger isOpen={dialogOpen} onOpenChange={setDialogOpen}>
            <Button
              leadingIcon={Plus}
              onClick={() => {
                setDraftDate(currentDate)
                setDialogOpen(true)
              }}
            >
              New event
            </Button>
            <ModalOverlay
              isDismissable
              className={({ isEntering, isExiting }) => cx(
                'fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-text-primary/30 p-4 backdrop-blur-sm',
                isEntering && 'animate-in fade-in duration-150',
                isExiting && 'animate-out fade-out duration-100',
              )}
            >
              <Modal className="w-full max-w-md outline-none">
                <Dialog aria-label="Create event" className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xl sm:p-6">
                  <form onSubmit={handleCreateEvent} className="flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-title-3-semibold text-text-primary">New event</h3>
                        <p className="mt-1 text-body-regular text-text-secondary">Saved in this browser for this account.</p>
                      </div>
                      <IconButton
                        icon={X}
                        size="small"
                        aria-label="Close event dialog"
                        onClick={() => setDialogOpen(false)}
                      />
                    </div>

                    <Input name="title" label="Event title" placeholder="Planning session" isRequired autoFocus />
                    <Textarea name="description" label="Description" placeholder="Add notes or details (optional)" rows={3} />

                    <div className="flex flex-col gap-1.5">
                      <span className="text-caption-1-semibold text-text-primary">Date</span>
                      <DatePicker value={draftDate} onChange={(date) => date && setDraftDate(date)} aria-label="Event date" />
                    </div>

                    <Checkbox isSelected={allDay} onChange={setAllDay}>All day</Checkbox>
                    {!allDay && (
                      <div className="grid grid-cols-2 gap-3">
                        <Input name="startTime" label="Starts" type="time" defaultValue="09:00" isRequired />
                        <Input name="endTime" label="Ends" type="time" defaultValue="10:00" isRequired />
                      </div>
                    )}

                    <fieldset className="flex flex-col gap-2">
                      <legend className="text-caption-1-semibold text-text-primary">Color</legend>
                      <div className="flex items-center gap-2">
                        {(['blue', 'green', 'pink', 'purple', 'amber'] as CalendarEventColor[]).map((eventColor) => (
                          <button
                            key={eventColor}
                            type="button"
                            aria-label={`${eventColor} event color`}
                            aria-pressed={color === eventColor}
                            onClick={() => setColor(eventColor)}
                            className={cx(
                              'size-7 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                              EVENT_STYLES[eventColor],
                              color === eventColor && 'ring-2 ring-border-focus-ring ring-offset-2',
                            )}
                          />
                        ))}
                      </div>
                    </fieldset>

                    {formError && <p role="alert" className="text-body-regular text-text-error-primary">{formError}</p>}

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save event'}</Button>
                    </div>
                  </form>
                </Dialog>
              </Modal>
            </ModalOverlay>
          </DialogTrigger>
        </div>
      </header>

      {eventsError ? (
        <p role="alert" className="text-body-regular text-text-error-primary">{eventsError}</p>
      ) : eventsLoading ? (
        <p role="status" className="text-body-regular text-text-secondary">Loading events...</p>
      ) : null}

      <MonthGrid
        date={currentDate}
        events={events}
        onSelectDate={onDateChange}
      />
    </section>
  )
}

function minutes(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  return hour * 60 + minute
}

