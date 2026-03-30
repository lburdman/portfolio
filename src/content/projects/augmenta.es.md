---
title: "Augmenta"
projectSlug: "augmenta"
summary: "Una capa de privacidad para flujos de trabajo con LLMs con detección de PII, anonimización y integración orientada a servicios — centrada en herramientas de privacidad, diseño de APIs e IA aplicada."
lang: "es"
tags: ["Privacidad", "LLM", "Python", "FastAPI", "Docker", "IA Aplicada"]
featured: true
status: "published"
github: "https://github.com/lburdman/augmenta"
order: 1
---

## Descripción General

Augmenta es una capa de privacidad de prueba de concepto diseñada para flujos de trabajo con LLMs. Aborda una brecha real en los sistemas de IA en producción: la necesidad de manejar información de identificación personal (PII) de forma segura antes de que llegue a un modelo de lenguaje.

## Problema

Enviar entradas de usuarios crudas a APIs de LLMs expone datos sensibles a servicios de terceros. La mayoría de los equipos manejan esto de forma ad hoc, o no lo hacen en absoluto. Augmenta explora un enfoque estructurado: detectar PII, anonimizarla de forma determinística, reenviar solo el texto limpio al modelo y luego rehidratar la respuesta antes de devolverla al cliente.

## Arquitectura

El sistema está organizado como un conjunto de servicios enfocados:

- **API de Ingesta**: Recibe la entrada cruda, ejecuta la detección de PII y orquesta el pipeline de anonimización.
- **Anonimizador**: Reemplaza las entidades detectadas con pseudónimos estables, manteniendo la integridad referencial en conversaciones multi-turno.
- **Gateway LLM**: Reenvía los prompts anonimizados al modelo objetivo. La PII cruda nunca llega a esta capa.
- **Rehidratador**: Restaura los pseudónimos a los valores originales en la respuesta del modelo.
- **Registro de auditoría**: Rastrea cada paso de transformación para observabilidad y cumplimiento.

## Decisiones de Diseño

- **Outputs estructurados**: Todas las respuestas de la API se validan con esquemas Pydantic para evitar que datos malformados se propaguen.
- **Pseudónimos determinísticos**: La misma entidad se mapea al mismo pseudónimo dentro de una sesión, permitiendo una rehidratación coherente en multi-turno.
- **Fronteras orientadas a servicios**: Cada preocupación está aislada detrás de una interfaz bien definida, haciendo los componentes testeables y reemplazables independientemente.
- **Sin persistencia de datos por defecto**: La PII se mantiene solo en memoria durante la duración de una solicitud a menos que se configure explícitamente de otra manera.
