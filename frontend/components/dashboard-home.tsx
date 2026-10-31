'use client'

import { useEffect, useState } from 'react'
import { getLocalTimeZone, today, type CalendarDate } from '@internationalized/date'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Smile,
  CalendarDays,
} from 'lucide-react'
import { StatCards, type Stat } from '@/components/application/dashboard/stat-cards'
import { Button } from '@/components/base/buttons/button'
import { DatePicker } from '@/components/base/date-picker/date-picker'
import { IconButton } from '@/components/base/buttons/icon-button'
import { Skeleton } from '@/components/base/skeleton/skeleton'
import { CalendarView } from '@/components/calendar-view'
import { CreateEventModal } from '@/components/create-event-modal'
import { EventDetailModal } from '@/components/event-detail-modal'
import { toast } from '@/components/base/toast/toast'
import { BackendError, createCalendarEvent, deleteCalendarEvent, displayName, getCalendarEvents, updateCalendarEvent, type CalendarEvent, type CurrentUser, type NewCalendarEvent, type WeekStartsOn } from '@/lib/api'
import { cx } from '@/utils/cx'

function startOfWeek(date: CalendarDate, weekStartsOn: WeekStartsOn) {
  const weekday = date.toDate(getLocalTimeZone()).getDay()
  const firstDay = weekStartsOn === 'sunday' ? 0 : 1
  return date.subtract({ days: (weekday - firstDay + 7) % 7 })
}

function eventRange(date: CalendarDate, weekStartsOn: WeekStartsOn) {
  const monthStart = date.set({ day: 1 })
  const firstVisibleDay = startOfWeek(monthStart, weekStartsOn)
  return {
    from: firstVisibleDay.toString(),
    to: firstVisibleDay.add({ days: 41 }).toString(),
  }
}

const EVENT_DOT_STYLES: Record<string, string> = {
  blue: 'bg-accent-600',
  green: 'bg-status-lime-text',
  pink: 'bg-status-rose-text',
  purple: 'bg-chart-1',
  amber: 'bg-chart-2',
}

const EVENT_COLOR_BAR: Record<string, string> = {
  blue: 'bg-accent-50',
  green: 'bg-status-lime-background',
  pink: 'bg-status-rose-background',
  purple: 'bg-chart-1/10',
  amber: 'bg-chart-2/10',
}

function formatDate(date: CalendarDate, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options).format(date.toDate(getLocalTimeZone()))
}

function formatTime(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2020, 0, 1, hour, minute),
  )
}

export function DashboardHome({ user, calendarOnly = false }: { user: CurrentUser; calendarOnly?: boolean }) {
  const [selectedDate, setSelectedDate] = useState(today(getLocalTimeZone()))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState('')
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const { from: eventsFrom, to: eventsTo } = eventRange(selectedDate, user.weekStartsOn)
  const weekStart = startOfWeek(selectedDate, user.weekStartsOn)
  const weekDays = Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index }))
  const greetingName = displayName(user).split(' ')[0]
  const todayKey = today(getLocalTimeZone()).toString()
  const weekStartKey = weekStart.toString()
  const weekEndKey = weekStart.add({ days: 6 }).toString()
  const selectedKey = selectedDate.toString()
  const todayCount = events.filter((event) => event.date === todayKey).length
  const weekCount = events.filter((event) => event.date >= weekStartKey && event.date <= weekEndKey).length
  const selectedDayEvents = events.filter((event) => event.date === selectedKey)
  const upcomingEvents = events
    .filter((event) => event.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    .slice(0, 5)
  const stats: Stat[] = [
    { icon: Calendar, label: 'Events today', value: String(todayCount), delta: todayCount ? 'Scheduled' : 'Nothing scheduled', deltaColor: todayCount ? 'lime' : 'neutral' },
    { icon: CalendarDays, label: 'Events this week', value: String(weekCount), delta: weekCount ? 'Scheduled' : 'Nothing scheduled', deltaColor: weekCount ? 'lime' : 'neutral' },
    { icon: Smile, label: 'Account', value: 'Active', delta: 'Signed in', deltaColor: 'lime' },
  ]

  useEffect(() => {
    let active = true
    setEventsLoading(true)
    setEventsError('')
    getCalendarEvents(eventsFrom, eventsTo)
      .then((loadedEvents) => {
        if (active) setEvents(loadedEvents)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof BackendError && error.status === 401) {
          setEventsError('Your session has expired. Sign in again to view your events.')
        } else {
          setEventsError('Unable to load events. Please try again.')
        }
      })
      .finally(() => {
        if (active) setEventsLoading(false)
      })

    return () => {
      active = false
    }
  }, [eventsFrom, eventsTo])

  async function handleCreateEvent(event: NewCalendarEvent) {
    const savedEvent = await createCalendarEvent(event)
    setEvents((currentEvents) => [...currentEvents, savedEvent])
    toast.success('Event created', { description: savedEvent.title })
    return savedEvent
  }

  async function handleUpdateEvent(id: string, event: NewCalendarEvent) {
    const savedEvent = await updateCalendarEvent(id, event)
    setEvents((currentEvents) => currentEvents.map((item) => (item.id === id ? savedEvent : item)))
    setDetailEvent((current) => (current?.id === id ? savedEvent : current))
    toast.success('Event updated', { description: savedEvent.title })
    return savedEvent
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    await deleteCalendarEvent(event.id)
    setEvents((currentEvents) => currentEvents.filter((item) => item.id !== event.id))
    setDetailEvent((current) => (current?.id === event.id ? null : current))
    setEditingEvent((current) => (current?.id === event.id ? null : current))
    toast('Event deleted', { description: event.title, status: 'neutral' })
  }

  function openEditEvent(event: CalendarEvent) {
    setDetailEvent(null)
    setEditingEvent(event)
  }

  if (calendarOnly) {
    return (
      <main className="mx-auto flex w-full max-w-[1440px] flex-col p-3 sm:p-4 lg:p-6">
        <CalendarView
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
          events={events}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
          weekStartsOn={user.weekStartsOn}
          defaultEventDuration={user.defaultEventDuration}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 p-4 sm:p-6 lg:p-10">
      {/* ── Header ── */}
      <section id="home" className="scroll-mt-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-caption-1-semibold uppercase tracking-wider text-text-tertiary">
              {formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <h1 className="mt-2 text-title-1-medium text-text-primary">
              Good to see you, {greetingName} 👋
            </h1>
            <p className="mt-1 text-body-regular text-text-secondary">
              Here&apos;s what&apos;s happening with your schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DatePicker
              value={selectedDate}
              onChange={(date) => {
                if (date) setSelectedDate(date)
              }}
              aria-label="Choose a date"
            />
            <Button
              onClick={() => setCreateOpen(true)}
            >
              + New event
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section aria-label="Calendar overview">
        <StatCards stats={stats} columns={4} />
      </section>

      {/* ── Main content ── */}
      <section className="scroll-mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-title-2-medium text-text-primary">Your calendar</h2>
            <p className="mt-1 text-body-regular text-text-secondary">Choose a day to see what&apos;s planned.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => setSelectedDate(today(getLocalTimeZone()))}>
            Today
          </Button>
        </div>

        {/* Error banner */}
        {eventsError && (
          <div className="mb-4 rounded-2xl border border-status-rose-text/20 bg-status-rose-background px-4 py-3 text-body-regular text-status-rose-text" role="alert">
            {eventsError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          {/* ── Week + Day panel ── */}
          <section className="col-span-2 rounded-3xl border border-border-button-default bg-background-primary-default p-4 sm:p-6 lg:col-span-1">
            {/* Week strip header */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-headline-medium text-text-primary">
                Week of {formatDate(weekStart, { month: 'short', day: 'numeric' })}
              </h3>
              <div className="flex items-center gap-1 rounded-xl border border-border-button-default bg-background-secondary-default p-1">
                <IconButton
                  icon={ArrowLeft}
                  size="small"
                  aria-label="Previous week"
                  onClick={() => setSelectedDate(selectedDate.subtract({ days: 7 }))}
                />
                <IconButton
                  icon={ArrowRight}
                  size="small"
                  aria-label="Next week"
                  onClick={() => setSelectedDate(selectedDate.add({ days: 7 }))}
                />
              </div>
            </div>

            {/* 7-day strip */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((date) => {
                const isSelected = date.compare(selectedDate) === 0
                const isToday = date.compare(today(getLocalTimeZone())) === 0
                const dayKey = date.toString()
                const hasEvents = events.some((e) => e.date === dayKey)
                return (
                  <button
                    key={`${date.year}-${date.month}-${date.day}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDate(date)}
                    className={cx(
                      'flex min-w-0 flex-col items-center gap-2 rounded-xl px-1 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                      isSelected ? 'bg-accent-600 text-text-white' : 'text-text-secondary hover:bg-background-secondary-hover',
                    )}
                  >
                    <span className="text-caption-2-medium">{formatDate(date, { weekday: 'short' })}</span>
                    <span className={cx(
                      'flex size-8 items-center justify-center rounded-full text-body-medium tabular-nums',
                      isSelected ? 'bg-foreground-full/15 text-text-white' : isToday ? 'bg-accent-50 text-accent-700' : 'text-text-primary',
                    )}>
                      {date.day}
                    </span>
                    {/* Event presence dot */}
                    <span
                      className={cx(
                        'size-1 rounded-full transition-opacity',
                        hasEvents ? (isSelected ? 'bg-white/60' : 'bg-accent-600') : 'opacity-0 bg-transparent',
                      )}
                      aria-hidden
                    />
                  </button>
                )
              })}
            </div>

            {/* Daily agenda */}
            <div className="mt-6 border-t border-separator-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-headline-medium text-text-primary">
                    {formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="mt-1 text-caption-1-regular text-text-tertiary">Daily agenda</p>
                </div>
                <span className="rounded-full bg-background-secondary-default px-3 py-1 text-caption-1-semibold text-text-secondary">
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {eventsLoading ? (
                  // Skeleton placeholders while loading
                  Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border-button-default bg-background-primary-default px-4 py-3">
                      <Skeleton className="size-2 rounded-full" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-4 w-2/3 rounded-md" />
                        <Skeleton className="h-3 w-1/3 rounded-md" />
                      </div>
                    </div>
                  ))
                ) : selectedDayEvents.length === 0 ? (
                  <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl bg-background-secondary-default px-5 py-8 text-center">
                    <Calendar className="size-6 text-foreground-icon-tertiary" aria-hidden />
                    <p className="mt-3 text-body-medium text-text-primary">Nothing scheduled</p>
                    <p className="mt-1 text-body-regular text-text-secondary">Your day is open.</p>
                    <Button
                      variant="secondary"
                      size="small"
                      className="mt-4"
                      onClick={() => setCreateOpen(true)}
                    >
                      + Add event
                    </Button>
                  </div>
                ) : (
                  selectedDayEvents
                    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
                    .map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        aria-label={`View details for ${event.title}`}
                        onClick={() => setDetailEvent(event)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border-button-default bg-background-primary-default px-4 py-3 text-start outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                      >
                        <span className={cx('size-2 shrink-0 rounded-full', EVENT_DOT_STYLES[event.color])} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-medium text-text-primary">{event.title}</p>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {event.allDay ? 'All day' : event.startTime && event.endTime
                              ? `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
                              : event.startTime ? formatTime(event.startTime) : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-caption-1-regular text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100">View →</span>
                      </button>
                    ))
                )}
              </div>
            </div>
          </section>

          {/* ── Upcoming panel ── */}
          <aside className="col-span-2 rounded-3xl border border-border-button-default bg-background-primary-default p-4 sm:p-6 lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-headline-medium text-text-primary">Coming up</h3>
              <span className="rounded-full bg-background-secondary-default px-2.5 py-0.5 text-caption-1-regular text-text-tertiary">
                Next events
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {eventsLoading ? (
                Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border-button-default bg-background-secondary-default px-4 py-3">
                    <Skeleton className="size-2 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                  </div>
                ))
              ) : upcomingEvents.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center py-8 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default text-foreground-icon-secondary">
                    <Calendar className="size-6" aria-hidden />
                  </span>
                  <p className="mt-4 text-body-medium text-text-primary">No upcoming events</p>
                  <p className="mt-1 max-w-xs text-body-regular text-text-secondary">
                    Your upcoming schedule will appear here.
                  </p>
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const isEventToday = event.date === todayKey
                  return (
                    <button
                      key={event.id}
                      type="button"
                      aria-label={`View details for ${event.title}`}
                      onClick={() => setDetailEvent(event)}
                      className={cx(
                        'group flex w-full items-center gap-3 rounded-xl border border-border-button-default px-4 py-3 text-start outline-none transition-colors hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                        EVENT_COLOR_BAR[event.color] ?? 'bg-background-secondary-default',
                      )}
                    >
                      <span className={cx('size-2 shrink-0 rounded-full', EVENT_DOT_STYLES[event.color])} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-medium text-text-primary">{event.title}</p>
                        <p className="text-caption-1-regular text-text-tertiary">
                          {isEventToday ? 'Today' : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${event.date}T12:00:00`))}
                          {!event.allDay && event.startTime ? ` · ${formatTime(event.startTime)}` : ''}
                        </p>
                      </div>
                      {isEventToday && (
                        <span className="shrink-0 rounded-full bg-accent-600 px-2 py-0.5 text-caption-2-medium text-text-white">
                          Today
                        </span>
                      )}
                      <span className="shrink-0 text-caption-1-regular text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100">View →</span>
                    </button>
                  )
                })
              )}
            </div>
          </aside>
        </div>
      </section>

      <EventDetailModal
        key={detailEvent?.id ?? 'closed'}
        event={detailEvent}
        isOpen={detailEvent !== null}
        onClose={() => setDetailEvent(null)}
        onEdit={openEditEvent}
        onDelete={handleDeleteEvent}
      />
      <CreateEventModal
        isOpen={createOpen || editingEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditingEvent(null)
          }
        }}
        initialDate={selectedDate}
        event={editingEvent}
        defaultEventDuration={user.defaultEventDuration}
        onSaveEvent={async (payload) => {
          if (editingEvent) {
            await handleUpdateEvent(editingEvent.id, payload)
          } else {
            await handleCreateEvent(payload)
          }
        }}
      />
    </main>
  )
}
