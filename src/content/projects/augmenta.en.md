---
title: "Augmenta"
projectSlug: "augmenta"
summary: "A privacy layer for LLM workflows with PII detection, anonymization, and service-oriented integration — built around privacy tooling, API design, and infrastructure-oriented applied AI."
lang: "en"
tags: ["Privacy", "LLM", "Python", "FastAPI", "Docker", "Applied AI"]
featured: true
status: "published"
github: "https://github.com/lburdman/augmenta"
order: 1
---

## Overview

Augmenta is a proof-of-concept privacy layer designed for LLM workflows. It addresses a real gap in production AI systems: the need to handle personally identifiable information (PII) safely before it ever reaches a language model.

## Problem

Sending raw user inputs to LLM APIs exposes sensitive data to third-party services. Most teams handle this ad hoc — or not at all. Augmenta explores a structured approach: detect PII, anonymize it deterministically, forward only the clean text to the model, then rehydrate the response before returning it to the client.

## Architecture

The system is organized as a set of focused services:

- **Ingestion API**: Receives raw input, runs PII detection, and orchestrates the anonymization pipeline.
- **Anonymizer**: Replaces detected entities with stable pseudonyms, maintaining referential integrity across multi-turn conversations.
- **LLM Gateway**: Forwards anonymized prompts to the target model. The raw PII never reaches this layer.
- **Rehydrator**: Restores pseudonyms to original values in the model's response.
- **Audit log**: Tracks every transformation step for observability and compliance.

## Design Decisions

- **Structured outputs**: All API responses are validated with Pydantic schemas to prevent malformed data from propagating.
- **Deterministic pseudonyms**: The same entity maps to the same pseudonym within a session, enabling coherent multi-turn rehydration.
- **Service-oriented boundaries**: Each concern is isolated behind a well-defined interface, making components testable and replaceable independently.
- **No data persistence by default**: PII is held only in memory for the duration of a request unless explicitly configured otherwise.

## Key Learnings

Building this surfaced the tension between LLM flexibility and structured data guarantees — a recurring challenge in production AI systems. Robust parsing of model outputs, handling of partial anonymization, and managing audit scope without over-logging are the hard parts.
