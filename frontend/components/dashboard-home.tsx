'use client'

import { useEffect, useState } from 'react'
import { getLocalTimeZone, today, type CalendarDate } from '@internationalized/date'
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Smile,
} from 'lucide-react'
import { StatCards, type Stat } from '@/components/application/dashboard/stat-cards'
import { Button } from '@/components/base/buttons/button'
import { DatePicker } from '@/components/base/date-picker/date-picker'
import { IconButton } from '@/components/base/buttons/icon-button'
import { CalendarView } from '@/components/calendar-view'
import { CreateEventModal } from '@/components/create-event-modal'
import { EventDetailModal } from '@/components/event-detail-modal'
import { BackendError, createCalendarEvent, getCalendarEvents, type CalendarEvent, type CurrentUser, type NewCalendarEvent } from '@/lib/api'
import { cx } from '@/utils/cx'

function startOfWeek(date: CalendarDate) {
  const weekday = date.toDate(getLocalTimeZone()).getDay()
  return date.subtract({ days: (weekday + 6) % 7 })
}

function eventRange(date: CalendarDate) {
  const monthStart = date.set({ day: 1 })
  const firstVisibleDay = monthStart.subtract({ days: monthStart.toDate(getLocalTimeZone()).getDay() })
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
function formatDate(date: CalendarDate, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options).format(date.toDate(getLocalTimeZone()))
}

export function DashboardHome({ user, calendarOnly = false }: { user: CurrentUser; calendarOnly?: boolean }) {
  const [selectedDate, setSelectedDate] = useState(today(getLocalTimeZone()))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const { from: eventsFrom, to: eventsTo } = eventRange(selectedDate)
  const weekStart = startOfWeek(selectedDate)
  const weekDays = Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index }))
  const firstName = user.email.split('@')[0].split(/[._-]/)[0]
  const greetingName = firstName.charAt(0).toUpperCase() + firstName.slice(1)
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
    { icon: Calendar, label: 'Events this week', value: String(weekCount), delta: weekCount ? 'Scheduled' : 'Nothing scheduled', deltaColor: weekCount ? 'lime' : 'neutral' },
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
    return savedEvent
  }

  if (calendarOnly) {
    return (
      <main className="mx-auto flex w-full max-w-[1440px] flex-col p-3 sm:p-4 lg:p-6">
        <CalendarView
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
          events={events}
          onCreateEvent={handleCreateEvent}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
        />
        <CreateEventModal
          isOpen={createModalOpen}
          onOpenChange={setCreateModalOpen}
          initialDate={selectedDate}
          onCreateEvent={async (event) => {
            await handleCreateEvent(event)
          }}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 p-4 sm:p-6 lg:p-10">
      <section id="home" className="scroll-mt-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-caption-1-semibold uppercase text-text-tertiary">
              {formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <h1 className="mt-2 text-title-1-medium text-text-primary">
              Good to see you, {greetingName}
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
            <Button leadingIcon={Plus} onClick={() => setCreateModalOpen(true)}>New event</Button>
          </div>
        </div>
      </section>

      <section aria-label="Calendar overview">
        <StatCards stats={stats} columns={4} />
      </section>

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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <section className="col-span-2 rounded-3xl border border-border-button-default bg-background-primary-default p-4 sm:p-6 lg:col-span-1">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-headline-medium text-text-primary">
                Week of {formatDate(weekStart, { month: 'short', day: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
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
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((date) => {
                const isSelected = date.compare(selectedDate) === 0
                const isToday = date.compare(today(getLocalTimeZone())) === 0
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
                  </button>
                )
              })}
            </div>

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
                {selectedDayEvents.length === 0 ? (
                  <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl bg-background-secondary-default px-5 py-8 text-center">
                    <Calendar className="size-6 text-foreground-icon-tertiary" aria-hidden />
                    <p className="mt-3 text-body-medium text-text-primary">Nothing scheduled</p>
                    <p className="mt-1 text-body-regular text-text-secondary">Your day is open.</p>
                  </div>
                ) : (
                  selectedDayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      aria-label={`View details for ${event.title}`}
                      onClick={() => setDetailEvent(event)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border-button-default bg-background-primary-default px-4 py-3 text-start outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                    >
                      <span className={cx('size-2 shrink-0 rounded-full', EVENT_DOT_STYLES[event.color])} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-medium text-text-primary">{event.title}</p>
                        <p className="text-caption-1-regular text-text-tertiary">
                          {event.allDay ? 'All day' : `${event.startTime} - ${event.endTime}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-caption-1-regular text-text-tertiary">View →</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="col-span-2 rounded-3xl border border-border-button-default bg-background-primary-default p-4 sm:p-6 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-medium text-text-primary">Coming up</h3>
              <span className="text-caption-1-regular text-text-tertiary">Next 7 days</span>
            </div>
            <div className="flex flex-col gap-2">
              {upcomingEvents.length === 0 ? (
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
                upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    aria-label={`View details for ${event.title}`}
                    onClick={() => setDetailEvent(event)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border-button-default bg-background-secondary-default px-4 py-3 text-start outline-none transition-colors hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                  >
                    <span className={cx('size-2 shrink-0 rounded-full', EVENT_DOT_STYLES[event.color])} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-medium text-text-primary">{event.title}</p>
                      <p className="text-caption-1-regular text-text-tertiary">
                        {new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${event.date}T12:00:00`))}
                        {!event.allDay && event.startTime ? ` · ${event.startTime}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-caption-1-regular text-text-tertiary">View →</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="scroll-mt-8 border-t border-separator-border pt-6">
        <h2 className="text-title-2-medium text-text-primary">Account</h2>
        <p className="mt-1 text-body-regular text-text-secondary">Signed in as {user.email}</p>
      </section>

      <CreateEventModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialDate={selectedDate}
        onCreateEvent={async (event) => {
          await handleCreateEvent(event)
        }}
      />

      <EventDetailModal
        event={detailEvent}
        isOpen={detailEvent !== null}
        onClose={() => setDetailEvent(null)}
      />
    </main>
  )
}