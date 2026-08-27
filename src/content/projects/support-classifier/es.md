---
title: 'Clasificador de Tickets de Soporte'
summary: 'Un clasificador de tickets de soporte asistido por IA con respuestas estructuradas validadas por esquema, un comportamiento de respaldo determinista que nunca lanza errores y una interfaz local mínima — enfocado en diseño de backend mantenible.'
---

## Resumen

Un servicio en FastAPI que clasifica mensajes de soporte con un modelo de lenguaje, valida el resultado contra un esquema tipado y recurre a una respuesta fija y segura cada vez que la salida del modelo no es confiable.

## El problema

Poner en producción clasificadores basados en LLMs deja al descubierto un problema práctico: la salida del modelo no es estructurada de forma confiable. Un modelo que responde "creo que podría ser un problema de facturación" no se puede interpretar desde un sistema posterior. El proyecto aborda esa distancia entre la flexibilidad de un LLM y el comportamiento estructurado que necesita quien lo consume.

## Arquitectura

- **Servicio de clasificación**: llama a la API de Anthropic con temperatura 0 y un prompt de sistema definido en un único módulo, y valida la respuesta contra un modelo Pydantic cuyos campos de categoría y prioridad son enumeraciones `Literal`.
- **Extracción multiformato**: primero se busca un bloque delimitado ` ```json `; si no aparece, un recorrido que cuenta llaves localiza los límites exactos del objeto dentro del texto que lo rodea.
- **Respaldo determinista**: el servicio nunca lanza una excepción. Cualquier error del proveedor o salida inválida devuelve un `ClassifyResponse` fijo con `is_fallback` y `needs_human_review` activados, de modo que quien llama siempre recibe un objeto válido y puede mostrar un aviso.
- **Aislamiento del proveedor**: todos los imports de Anthropic viven en `classifier.py`; cambiar de proveedor implica tocar solo ese archivo.
- **Interfaz local**: una única página Jinja2 para enviar un mensaje e inspeccionar la clasificación.

## Decisiones de diseño

- **El esquema primero**: los esquemas de salida se definen con Pydantic y se aplican antes de que se ejecute cualquier lógica posterior.
- **Modos de falla explícitos**: los errores de autenticación y configuración, los de red transitorios, el JSON inválido y las respuestas que no cumplen el esquema se capturan por separado y se registran de forma distinta, así una respuesta de respaldo en producción se puede rastrear hasta su causa.
- **Estructura verificable**: tres módulos de pruebas cubren los casos límite del esquema, el servicio y el endpoint. Todas las llamadas a Anthropic están simuladas, por lo que la suite corre sin necesidad de una clave de API.
- **Deliberadamente chico**: sin base de datos, sin autenticación y sin Docker — la tarea no los pedía y habrían tapado la lógica de clasificación.

## Conclusiones

Lo más difícil de un sistema apoyado en un LLM no es el modelo, sino todo lo que lo rodea. La extracción de la respuesta, el comportamiento de respaldo, la distinción entre clases de falla y la estabilidad del contrato de salida son lo que separa una demo de algo en lo que otro sistema puede confiar.
