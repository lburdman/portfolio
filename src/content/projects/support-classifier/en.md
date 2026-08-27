---
title: 'Support Ticket Classifier'
summary: 'An AI-assisted support ticket classifier with schema-validated structured output, a deterministic fallback that never raises, and a minimal local UI — focused on maintainable backend design and practical handling of model output.'
---

## Overview

A FastAPI service that classifies incoming support messages with a language model, validates the result against a typed schema, and falls back to a fixed, safe response whenever the model output cannot be trusted.

## Problem

Deploying LLM-based classifiers exposes a practical challenge: model output is not reliably structured. A model that returns "I think this might be a billing issue" is not parseable by downstream systems. This project addresses the gap between LLM flexibility and the structured behaviour production callers need.

## Architecture

- **Classifier service**: Calls the Anthropic API at temperature 0 with a system prompt held in a single module, then validates the reply against a Pydantic response model whose category and priority fields are `Literal` enums.
- **Multi-format extraction**: A fenced ` ```json ` block is tried first, then a brace-depth scan that finds the exact object boundaries inside surrounding prose.
- **Deterministic fallback**: The service never raises. Any provider error or invalid output returns one fixed `ClassifyResponse` with `is_fallback` and `needs_human_review` set, so the caller always receives a valid object and can surface a warning.
- **Provider isolation**: Every Anthropic import lives in `classifier.py`; swapping providers means touching that one file.
- **Local UI**: A single Jinja2 page for submitting a message and inspecting the classification.

## Key Design Decisions

- **Schema-first**: Output schemas are defined with Pydantic and enforced before any downstream logic runs.
- **Explicit failure modes**: Auth and configuration errors, transient network errors, invalid JSON and schema mismatches are caught separately and logged distinctly, so a fallback in production is traceable to its cause.
- **Testable structure**: Three test modules cover schema edge cases, the service, and the endpoint. Every Anthropic call is mocked, so the suite runs without an API key.
- **Deliberately small**: No database, no auth, no Docker — the task did not need them, and they would have obscured the classification logic.

## Key Learnings

The hardest part of an LLM-backed system is not the model — it is everything around it. Extraction, fallback behaviour, distinguishing failure classes and keeping the response contract stable are what separate a demo from something a caller can depend on.
