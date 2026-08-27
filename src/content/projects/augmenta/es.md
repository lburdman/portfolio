---
title: 'Augmenta'
summary: 'Una capa de privacidad de prueba de concepto para flujos con LLMs: detección de PII con Presidio, tokenización acotada a cada petición sobre una bóveda cifrada y rehidratación en el camino de vuelta — servicios en Go alrededor de un servicio de detección en Python.'
---

## Resumen

Augmenta es una capa de privacidad de prueba de concepto para flujos de trabajo con LLMs; el propio repositorio se describe como un scaffold, y ese es el alcance honesto. Aborda una brecha real de los sistemas de IA en producción: qué hacer con la información de identificación personal (PII) antes de que llegue a un modelo de lenguaje.

## El problema

Enviar la entrada cruda de un usuario a la API de un LLM expone datos sensibles a un servicio de terceros. La mayoría de los equipos resuelve esto de manera improvisada, o directamente no lo resuelve. Augmenta explora un enfoque estructurado: detectar la PII, reemplazar cada fragmento detectado por un token, enviar al modelo únicamente el texto tokenizado y rehidratar la respuesta antes de devolverla al cliente.

## Arquitectura

Cuatro servicios sobre Docker Compose, enrutados por inquilino y origen desde `configs/flows.yaml`:

- **Servicio de ingesta (Go)**: recibe el webhook, resuelve el flujo del par inquilino/origen y coordina la detección, la escritura en la bóveda, la llamada al modelo y la rehidratación.
- **Servicio de privacidad (Python / FastAPI)**: el único componente que ve el texto crudo. Microsoft Presidio detecta las entidades y cada fragmento detectado se reemplaza por un token posicional como `[[AUG:EMAIL_ADDRESS:1]]`.
- **Bóveda (Go, DynamoDB)**: guarda la correspondencia entre token y valor original bajo cifrado de sobre — una clave de datos AES-GCM generada por inquilino y petición, envuelta a su vez por una clave maestra — con un tiempo de vida definido en el flujo.
- **Gateway de LLM (Go)**: recibe solo texto tokenizado. En la versión publicada es un proveedor de eco que calcula el hash del prompt y expone un endpoint `/last`, para que las pruebas puedan verificar que ninguna PII cruzó ese límite.

Una interfaz de demostración en React envía una frase y muestra la tokenización, la llamada al gateway y la rehidratación de punta a punta. Un búfer circular en memoria conserva los 200 eventos más recientes de `anonymize`, `vault_put`, `llm_call` y `rehydrate`: solo recuentos y latencias, nunca el texto de origen ni la salida del modelo.

## Decisiones de diseño

- **Tokens acotados a la petición**: las entidades se numeran por tipo dentro de una misma petición (`[[AUG:PERSON:1]]`, `[[AUG:PERSON:2]]`) y la correspondencia se guarda bajo ese identificador. La rehidratación es coherente para esa petición, pero los tokens no son estables entre peticiones y no existe una seudonimización que atraviese sesiones.
- **Falla cerrada**: cada flujo declara `failClosed`. Si falla la detección, la escritura en la bóveda o la rehidratación, la petición devuelve un error con paso y código de motivo tipados, en lugar de degradarse en una llamada parcialmente anonimizada.
- **Cifrado en reposo y con vencimiento**: los valores originales no quedan solo en memoria; se escriben cifrados en la bóveda, con un vencimiento de una hora en la configuración publicada. Un token vencido hace fallar la rehidratación en vez de devolverle un token al cliente sin avisar.
- **Nunca registrar el contenido**: el servicio de privacidad registra el recuento de entidades y la latencia; el gateway registra un SHA-256 del prompt. Ninguno de los dos escribe el texto.
- **Contratos tipados en cada salto**: modelos Pydantic en el servicio de privacidad, structs de Go y pasos de error tipados en la ruta de ingesta, de modo que una carga malformada falla en el límite y no más adelante.

## Conclusiones

Los problemas difíciles estaban en los límites entre servicios, no en la detección. De la detección se encarga Presidio; todo lo que la rodea es el trabajo de diseño. Qué ocurre cuando la escritura en la bóveda funciona pero la rehidratación se encuentra con un token vencido. Cuánto puede registrar una traza de auditoría antes de convertirse en la filtración que venía a evitar. Dónde queda realmente el límite de confianza cuando hay un tercer servicio en el camino, y qué le está permitido registrar a un servicio que vio texto crudo.
