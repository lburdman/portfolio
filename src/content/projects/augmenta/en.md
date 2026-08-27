---
title: 'Augmenta'
summary: 'A proof-of-concept privacy layer for LLM workflows: Presidio-based PII detection, request-scoped tokenization behind an encrypted vault, and rehydration on the way back — Go services around a Python detection service.'
---

## Overview

Augmenta is a proof-of-concept privacy layer for LLM workflows — the repository describes itself as a scaffold, and that is the honest scope. It addresses a real gap in production AI systems: handling personally identifiable information (PII) before it ever reaches a language model.

## Problem

Sending raw user input to an LLM API exposes sensitive data to a third-party service. Most teams handle this ad hoc — or not at all. Augmenta explores a structured approach: detect PII, replace each detected span with a token, forward only the tokenized text to the model, then rehydrate the response before returning it to the client.

## Architecture

Four services behind Docker Compose, routed by tenant and source from `configs/flows.yaml`:

- **Ingestion service (Go)**: Receives the webhook, resolves the tenant/source flow, and orchestrates detection, vault write, model call and rehydration.
- **Privacy service (Python / FastAPI)**: The only component that sees raw text. Microsoft Presidio detects entities; each detected span is replaced with a positional token such as `[[AUG:EMAIL_ADDRESS:1]]`.
- **Vault (Go, DynamoDB)**: Stores the token-to-original mappings under envelope encryption — an AES-GCM data key generated per tenant and request, itself wrapped by a master key — with a TTL taken from the flow.
- **LLM gateway (Go)**: Receives only tokenized text. In the shipped build it is an echo provider that hashes the prompt and exposes a `/last` endpoint, so tests can assert that no PII crossed the boundary.

A React demo UI submits a phrase and shows tokenization, gateway call and rehydration end to end. An in-memory audit ring buffer holds the 200 most recent events across `anonymize`, `vault_put`, `llm_call` and `rehydrate` — counts and latencies only, never source text or model output.

## Design Decisions

- **Request-scoped tokens**: Entities are numbered per type within a single request (`[[AUG:PERSON:1]]`, `[[AUG:PERSON:2]]`), and the mapping is stored under that request id. Rehydration is therefore coherent for that request. Tokens are not stable across requests, and cross-session pseudonymisation is not built.
- **Fail closed**: Each flow declares `failClosed`. When detection, the vault write or rehydration fails, the request errors with a typed step and reason code rather than degrading into a partially anonymized call.
- **Encrypted at rest, expiring by default**: Originals are not held only in memory — they are written to the vault encrypted, with a TTL of one hour in the shipped config. An expired token fails rehydration instead of silently returning a token to the caller.
- **Never log the payload**: The privacy service logs entity counts and latency; the gateway logs a SHA-256 of the prompt. Neither logs the text.
- **Typed contracts at every hop**: Pydantic models in the privacy service, Go structs and typed error steps in the ingestion path, so a malformed payload fails at the boundary rather than downstream.

## Key Learnings

The hard problems sat at the boundaries, not in the detection. Presidio does the detection; everything around it is the design work. What happens when the vault write succeeds but rehydration meets an expired token. How much an audit trail can record before it becomes the leak it was built to prevent. Where the trust boundary actually falls once a third service is in the path, and what a service is allowed to log once it has seen raw text.
