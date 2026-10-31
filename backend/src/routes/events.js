import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
const colors = ["blue", "green", "pink", "purple", "amber"];
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

// Utility function to check if a string is a valid calendar date in the format YYYY-MM-DD
function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// This file defines the routes for managing events in the calendar application. 
// It uses Express to create a router and Zod for input validation. 
// The routes include fetching events within a specified date range and creating new events. 
// The `requireAuth` middleware ensures that only authenticated users can access these routes. 
// The code also includes utility functions for validating dates and formatting event responses.
const calendarDate = z.string().refine(isCalendarDate, "Invalid date");
const time = z.string().regex(timePattern, "Time must use HH:mm format");
const eventInput = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).nullable().optional(),
  date: calendarDate,
  startTime: time.nullable(),
  endTime: time.nullable(),
  allDay: z.boolean(),
  color: z.enum(colors),
}).superRefine((event, context) => {
  if (event.allDay) return;
  if (!event.startTime || !event.endTime) {
    context.addIssue({ code: "custom", message: "Start and end times are required" });
    return;
  }
  if (event.endTime <= event.startTime) {
    context.addIssue({ code: "custom", message: "End time must be after start time" });
  }
});

function toEventResponse(event) {
  return { ...event, date: event.date.toISOString().slice(0, 10) };
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  const range = z.object({ from: calendarDate, to: calendarDate }).safeParse(req.query);
  if (!range.success) return res.status(400).json({ error: "A valid from and to date are required" });

  const { from, to } = range.data;
  if (from > to) return res.status(400).json({ error: "From date must be before to date" });

  try {
    const events = await prisma.event.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: new Date(`${from}T00:00:00.000Z`),
          lte: new Date(`${to}T00:00:00.000Z`),
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    res.json(events.map(toEventResponse));
  } catch (error) {
    console.error("Failed to load events:", error);
    res.status(500).json({ error: "Unable to load events" });
  }
});

router.post("/", async (req, res) => {
  const parsed = eventInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid event" });
  }

  const input = parsed.data;
  try {
    const event = await prisma.event.create({
      data: {
        ...input,
        description: input.description || null,
        date: new Date(`${input.date}T00:00:00.000Z`),
        startTime: input.allDay ? null : input.startTime,
        endTime: input.allDay ? null : input.endTime,
        userId: req.userId,
      },
    });
    res.status(201).json(toEventResponse(event));
  } catch (error) {
    console.error("Failed to create event:", error);
    res.status(500).json({ error: "Unable to create event" });
  }
});

router.put("/:id", async (req, res) => {
  const parsed = eventInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid event" });
  }

  const input = parsed.data;
  try {
    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Event not found" });

    const event = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...input,
        description: input.description || null,
        date: new Date(`${input.date}T00:00:00.000Z`),
        startTime: input.allDay ? null : input.startTime,
        endTime: input.allDay ? null : input.endTime,
      },
    });
    res.json(toEventResponse(event));
  } catch (error) {
    console.error("Failed to update event:", error);
    res.status(500).json({ error: "Unable to update event" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Event not found" });

    await prisma.event.delete({ where: { id: existing.id } });
    res.sendStatus(204);
  } catch (error) {
    console.error("Failed to delete event:", error);
    res.status(500).json({ error: "Unable to delete event" });
  }
});

export default router;