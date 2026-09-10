---
title: 'Momentum Tracker'
summary: 'A local-first personal tracker built around habit completion — a month calendar, a twelve-month heatmap and streak arithmetic over data that never leaves the device. React and Go, behind a ports-and-adapters seam. In active development.'
---

## Overview

Momentum Tracker records what you meant to do and shows you whether you did it. Habits are the core: each day is marked complete or not, and that record is rendered three ways — a month calendar, a rolling twelve-month heatmap, and a running streak.

It is not only habits. The app carries six domains behind one shell — Today, Habits, Reading, Expenses, Projects and Planner — because the things worth tracking about a week do not separate cleanly, and splitting them into six apps would mean six places to forget about.

**This project is unfinished and is presented as such.** It is under active work on frontend, interaction and features, and nothing here describes it as shipped.

## Problem

Habit trackers usually ask for an account before they show you anything, then keep your record on someone else's machine. A record of what you did every day for a year is unusually personal, and it is also the kind of data whose value is entirely private — nobody else needs it, so nobody else should hold it.

The constraint that shaped the build: the app has to be fully useful with no account, no network and no server, while leaving a route to synchronisation open rather than architecturally impossible.

## Approach

1. **Ports and adapters, from the start.** Each domain declares a port — `habits`, `books`, `expenses`, `planner`, `projects`, `auth` — and the application talks only to those. Three adapter families implement them: IndexedDB (the default), in-memory (for tests), and HTTP.
2. **The HTTP adapter fails loudly rather than quietly.** Selecting remote mode today throws with a message naming the phase that will implement it. A half-wired sync path that silently drops writes would be worse than one that refuses to start.
3. **Habit analysis as plain functions.** Streaks, completion rates, weekly trend and the year heatmap are pure arithmetic in their own modules, unit-tested away from any component.
4. **A Go API alongside, not underneath.** Go 1.25 with SQLite through a pure-Go driver and no ORM, structured the same hexagonal way. It exists so identity has somewhere to live when sync arrives.
5. **Bilingual by construction.** Spanish is the default and English is complete, every string in typed dictionary slices rather than scattered through components.

## Where it stands

129 commits, and the work sits on a feature branch rather than on `main`. Coverage is 425 Vitest cases across the web app and 52 Go tests across the API, gated together in CI — tests, typecheck and build must all pass before a merge.

It ships as a PWA and as a Capacitor iOS shell with a WidgetKit widget, and it is MIT licensed.

## What it is not

Worth stating plainly, because a habit tracker invites assumptions:

- **Not deployed.** There is no hosted instance and no demo. CI checks the code; it does not ship it anywhere.
- **Not in any app store**, and the iOS target has not been compiled on the machine it was written on.
- **No sync and no accounts in the working app.** The identity API exists on a branch; the web app's remote mode deliberately refuses to run.
- **The iOS widget shows expenses, not habits.**
- **No usage numbers**, because there are no users — it is a personal tool, not a product with an audience.

## Key learnings

Writing the in-memory adapter first, before IndexedDB, was the decision that paid. It forced every port to be defined in terms of what the application needed rather than what the database made convenient, and it meant the entire test suite could run without a browser storage shim.

The other lesson is about honesty in scaffolding. The HTTP adapter could have been stubbed to return empty results and look finished. Making it throw, with the phase named in the message, keeps the gap visible in the one place a developer will actually meet it — and this entry exists to keep that gap visible here too.
