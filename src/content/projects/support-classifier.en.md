---
title: "Support Ticket Classifier"
projectSlug: "support-classifier"
summary: "An AI-assisted support ticket classifier with validated structured outputs, deterministic fallbacks, and a lightweight local UI — focused on maintainable backend design and practical handling of model outputs."
lang: "en"
tags: ["AI", "NLP", "Python", "Pydantic", "Anthropic", "Classification"]
featured: true
status: "published"
github: "https://github.com/lburdman/support-ticket-classifier"
order: 4
---

## Overview

A support ticket classification system that uses a language model to categorize incoming tickets, with structured output validation, deterministic fallback behavior, and a minimal local interface for inspection.

## Problem

Deploying LLM-based classifiers in production exposes a practical challenge: model outputs are not reliably structured. A model that returns "I think this might be a billing issue" is not parseable by downstream systems. This project addresses the gap between LLM flexibility and the structured behavior required for production use.

## Architecture

- **Classifier backend**: Calls an LLM API with a structured prompt and extracts a Pydantic-validated classification object from the response.
- **Multi-format parsing**: Handles JSON in code blocks, inline JSON, and prose-wrapped outputs — a common response variability in practice.
- **Fallback logic**: When parsing fails, falls back to a deterministic rule-based classifier rather than propagating an error.
- **Audit layer**: Logs classification decisions with confidence scores and parsing status for observability.
- **Local UI**: A minimal interface for submitting tickets and inspecting classification results.

## Key Design Decisions

- **Schema-first approach**: Output schemas are defined with Pydantic and enforced before any downstream logic executes.
- **Explicit failure modes**: The system distinguishes between configuration failures, network failures, and parsing failures — each handled differently.
- **Testable structure**: The parsing and fallback logic is fully unit-testable without live API access.

## Key Learnings

The hardest part of LLM-backed systems is not the model — it is everything around it. Parsing, fallbacks, retry logic, and observability are what separate a demo from a production system.
