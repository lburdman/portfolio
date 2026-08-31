---
title: 'Momentum Tracker'
summary: 'Un tracker personal local-first construido alrededor del cumplimiento de hábitos — calendario mensual, heatmap de doce meses y cálculo de rachas sobre datos que nunca salen del dispositivo. React y Go, detrás de una separación de puertos y adaptadores. En desarrollo activo.'
---

## Resumen

Momentum Tracker registra lo que uno se propuso hacer y muestra si lo hizo. Los hábitos son el núcleo: cada día se marca como cumplido o no, y ese registro se representa de tres maneras — un calendario mensual, un heatmap móvil de doce meses y una racha en curso.

No es sólo hábitos. La aplicación sostiene seis dominios detrás de una misma interfaz — Hoy, Hábitos, Lectura, Gastos, Proyectos y Planner — porque las cosas que vale la pena registrar de una semana no se separan de forma limpia, y partirlas en seis aplicaciones significaría seis lugares para olvidarse.

**Este proyecto está sin terminar y se presenta como tal.** Está en trabajo activo sobre frontend, interacción y funcionalidades, y nada de lo que sigue lo describe como terminado.

## El problema

Los trackers de hábitos suelen pedir una cuenta antes de mostrar nada, y después guardan el registro en la máquina de otro. Un registro de lo que uno hizo cada día durante un año es particularmente personal, y además es un dato cuyo valor es enteramente privado: nadie más lo necesita, así que nadie más debería tenerlo.

La restricción que le dio forma al desarrollo: la aplicación tiene que ser completamente útil sin cuenta, sin red y sin servidor, dejando abierta la vía a la sincronización en lugar de volverla imposible por arquitectura.

## Enfoque

1. **Puertos y adaptadores, desde el principio.** Cada dominio declara un puerto — `habits`, `books`, `expenses`, `planner`, `projects`, `auth` — y la aplicación habla únicamente con ellos. Tres familias de adaptadores los implementan: IndexedDB (el que corre por defecto), memoria (para los tests) y HTTP.
2. **El adaptador HTTP falla fuerte, no en silencio.** Elegir el modo remoto hoy lanza un error que nombra la fase que lo va a implementar. Un camino de sincronización a medio cablear que descarte escrituras sin avisar sería peor que uno que se niega a arrancar.
3. **El análisis de hábitos como funciones puras.** Rachas, tasa de cumplimiento, tendencia semanal y el heatmap anual son aritmética en sus propios módulos, con tests unitarios lejos de cualquier componente.
4. **Una API en Go al lado, no debajo.** Go 1.25 con SQLite a través de un driver puro y sin ORM, estructurada de la misma forma hexagonal. Existe para que la identidad tenga dónde vivir cuando llegue la sincronización.
5. **Bilingüe por construcción.** El español es el idioma por defecto y el inglés está completo, con cada texto en diccionarios tipados y no repartido entre los componentes.

## Estado actual

129 commits, y el trabajo está en una rama de feature, no en `main`. La cobertura es de 425 casos de Vitest en la aplicación web y 52 tests de Go en la API, verificados juntos en CI: tests, typecheck y build tienen que pasar antes de un merge.

Se distribuye como PWA y como shell de iOS con Capacitor, con un widget de WidgetKit, bajo licencia MIT.

## Lo que no es

Vale la pena decirlo con claridad, porque un tracker de hábitos invita a suposiciones:

- **No está desplegado.** No hay instancia hosteada ni demo. CI verifica el código; no lo publica en ningún lado.
- **No está en ninguna tienda de aplicaciones**, y el target de iOS no fue compilado en la máquina donde se escribió.
- **No hay sincronización ni cuentas en la aplicación que funciona.** La API de identidad existe en una rama; el modo remoto de la web se niega a correr deliberadamente.
- **El widget de iOS muestra gastos, no hábitos.**
- **No hay números de uso**, porque no hay usuarios: es una herramienta personal, no un producto con audiencia.

## Aprendizajes

Escribir primero el adaptador en memoria, antes que el de IndexedDB, fue la decisión que rindió. Obligó a definir cada puerto en función de lo que la aplicación necesitaba y no de lo que a la base de datos le resultaba cómodo, y permitió que toda la suite de tests corriera sin un sustituto del almacenamiento del navegador.

La otra lección es sobre la honestidad en el andamiaje. El adaptador HTTP podría haberse dejado devolviendo resultados vacíos y parecería terminado. Hacer que lance un error, con la fase nombrada en el mensaje, mantiene el hueco visible en el único lugar donde alguien que programa se lo va a encontrar de verdad — y esta entrada existe para mantener ese hueco visible también acá.
