'use client'

import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'
import { Button as AriaButton, Dialog, DialogTrigger, Popover } from 'react-aria-components'
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  AlignLeft,
  Clock,
  Globe,
  Pencil,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/base/buttons/button'
import { DatePicker } from '@/components/base/date-picker/date-picker'
import { IconButton } from '@/components/base/buttons/icon-button'
import { CreateEventModal } from '@/components/create-event-modal'
import type { CalendarEvent, CalendarEventColor, NewCalendarEvent, WeekStartsOn } from '@/lib/api'
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

function startOfWeek(date: CalendarDate, weekStartsOn: WeekStartsOn) {
  const weekday = date.toDate(getLocalTimeZone()).getDay()
  const firstDay = weekStartsOn === 'sunday' ? 0 : 1
  return date.subtract({ days: (weekday - firstDay + 7) % 7 })
}

function monthGrid(date: CalendarDate, weekStartsOn: WeekStartsOn) {
  const firstOfMonth = date.set({ day: 1 })
  const start = startOfWeek(firstOfMonth, weekStartsOn)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

/** Weekday headers rotated to match the configured first day of the week. */
function weekdayHeaders(weekStartsOn: WeekStartsOn) {
  return weekStartsOn === 'sunday' ? WEEKDAYS : [...WEEKDAYS.slice(1), WEEKDAYS[0]]
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
  onEdit,
  children,
}: {
  event: CalendarEvent
  className: string
  style?: CSSProperties
  onEdit: (event: CalendarEvent) => void
  children: ReactNode
}) {
  const duration = eventDuration(event)
  const [open, setOpen] = useState(false)

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
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

          <div className="flex justify-end pt-1">
            <Button
              size="small"
              leadingIcon={Pencil}
              onClick={() => {
                setOpen(false)
                onEdit(event)
              }}
            >
              Edit event
            </Button>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}

function MonthGrid({
  date,
  events,
  onSelectDate,
  onEditEvent,
  weekStartsOn,
}: {
  date: CalendarDate
  events: CalendarEvent[]
  onSelectDate: (date: CalendarDate) => void
  onEditEvent: (event: CalendarEvent) => void
  weekStartsOn: WeekStartsOn
}) {
  const cells = monthGrid(date, weekStartsOn)
  const todayKey = dateKey(today(getLocalTimeZone()))

  return (
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default p-1.5 sm:p-2.5">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekdayHeaders(weekStartsOn).map((day) => (
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
                    onEdit={onEditEvent}
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
  onUpdateEvent,
  eventsLoading = false,
  eventsError = '',
  weekStartsOn = 'monday',
  defaultEventDuration = 60,
}: {
  currentDate: CalendarDate
  onDateChange: (date: CalendarDate) => void
  events: CalendarEvent[]
  onCreateEvent: (event: NewCalendarEvent) => Promise<CalendarEvent>
  onUpdateEvent: (id: string, event: NewCalendarEvent) => Promise<CalendarEvent>
  eventsLoading?: boolean
  eventsError?: string
  weekStartsOn?: WeekStartsOn
  defaultEventDuration?: number
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const dateTriggerRef = useRef<HTMLButtonElement>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const monthName = formatDate(currentDate, { month: 'long', year: 'numeric' })

  function shiftPeriod(direction: number) {
    onDateChange(currentDate.set({ day: 1 }).add({ months: direction }))
  }

  function openCreate() {
    setEditingEvent(null)
    setFormOpen(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event)
    setFormOpen(true)
  }

  async function handleSaveEvent(payload: NewCalendarEvent) {
    if (editingEvent) {
      const saved = await onUpdateEvent(editingEvent.id, payload)
      onDateChange(parseSavedDate(saved.date, currentDate))
      return
    }
    const saved = await onCreateEvent(payload)
    onDateChange(parseSavedDate(saved.date, currentDate))
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

          <Button leadingIcon={Plus} onClick={openCreate}>
            New event
          </Button>
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
        onEditEvent={openEdit}
        weekStartsOn={weekStartsOn}
      />

      <CreateEventModal
        isOpen={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingEvent(null)
        }}
        initialDate={currentDate}
        event={editingEvent}
        defaultEventDuration={defaultEventDuration}
        onSaveEvent={handleSaveEvent}
      />
    </section>
  )
}

function parseSavedDate(date: string, fallback: CalendarDate) {
  try {
    return parseDate(date)
  } catch {
    return fallback
  }
}

