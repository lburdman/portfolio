---
title: "Clasificador de Tickets de Soporte"
projectSlug: "support-classifier"
summary: "Un clasificador de tickets de soporte asistido por IA con outputs estructurados validados, fallbacks determinísticos y una UI local ligera — enfocado en diseño de backend mantenible y manejo práctico de respuestas del modelo."
lang: "es"
tags: ["IA", "NLP", "Python", "Pydantic", "Anthropic", "Clasificación"]
featured: true
status: "published"
github: "https://github.com/lburdman/support-ticket-classifier"
order: 4
---

## Descripción General

Un sistema de clasificación de tickets de soporte que usa un modelo de lenguaje para categorizar tickets entrantes, con validación de outputs estructurados, comportamiento de fallback determinístico y una interfaz local mínima para inspección.

## Problema

Desplegar clasificadores basados en LLMs en producción expone un desafío práctico: los outputs del modelo no son estructurados de forma confiable. Un modelo que devuelve "Creo que podría ser un problema de facturación" no es parseable por sistemas finales. Este proyecto aborda la brecha entre la flexibilidad de los LLMs y el comportamiento estructurado requerido para uso en producción.

## Arquitectura

- **Backend del clasificador**: Llama a una API de LLM con un prompt estructurado y extrae un objeto de clasificación validado con Pydantic de la respuesta.
- **Parsing multi-formato**: Maneja JSON en bloques de código, JSON inline y outputs envueltos en prosa — una variabilidad común de respuestas en la práctica.
- **Lógica de fallback**: Cuando el parsing falla, cae en un clasificador basado en reglas determinístico en lugar de propagar un error.
- **Capa de auditoría**: Registra las decisiones de clasificación con puntajes de confianza y estado de parsing para observabilidad.
- **UI local**: Una interfaz mínima para enviar tickets e inspeccionar resultados de clasificación.

## Decisiones de Diseño Clave

- **Enfoque schema-first**: Los esquemas de output se definen con Pydantic y se aplican antes de que se ejecute cualquier lógica posterior.
- **Modos de fallo explícitos**: El sistema distingue entre fallos de configuración, de red y de parsing — cada uno manejado de forma diferente.
- **Estructura testeable**: La lógica de parsing y fallback es completamente testeable con unit tests sin acceso a la API en vivo.
