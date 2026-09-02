---
title: 'Simulador de Acústica de Salas'
summary: 'Un motor en Go que responde dos preguntas sobre una sala rectangular — cuánto tarda el sonido en decaer y qué modos propios impone la geometría — y demuestra sus respuestas contra un registro generado de 78 verificaciones con tolerancia declarada, todas en verde, incluida una que estuvo meses en rojo porque el error estaba en la especificación.'
---

## Resumen

Una sala moldea todo sonido que se produce dentro de ella. Dos propiedades lo gobiernan: el tiempo de reverberación, que es cuánto tarda la energía en caer 60 dB, y la distribución modal, que es el conjunto de ondas estacionarias que la geometría impone en bajas frecuencias. Este motor calcula ambas para una sala rectangular y las expone a través de una API HTTP, con una interfaz de navegador encima: se cargan las dimensiones, se asignan materiales a cada superficie, y después se elige un modo de la tabla para ver su onda estacionaria sobre un plano de corte de la sala. La portada de esta entrada es esa herramienta, con el modo axial de 57,17 Hz seleccionado.

Lo interesante no es la física, que es de manual. Es que cada número que el motor produce se verifica contra una tolerancia declarada — y que cuando una de esas verificaciones se puso en rojo, siguió en rojo en el reporte hasta que se corrigió la especificación que la causaba.

## Problema

Las calculadoras acústicas son fáciles de escribir y difíciles de creer. La ecuación de Sabine tiene cuatro símbolos; la de modos propios no es mucho peor. Cualquiera puede implementarlas. La dificultad está en saber si una implementación dada es correcta — y la mayoría de las herramientas responden esa pregunta afirmándolo.

La restricción de diseño, entonces, no fue "calcular RT60" sino "hacer que la corrección del cálculo sea verificable desde afuera".

## Enfoque

El núcleo es Go sin dependencias de terceros, de modo que la aritmética no tiene ninguna biblioteca entre ella y las ecuaciones. Alrededor:

1. **Decaimiento estadístico** — RT60 por banda de octava, por Sabine y por Eyring-Norris, sobre un catálogo embebido de 46 coeficientes de absorción cuyas fuentes están documentadas una por una.
2. **Análisis modal** — enumeración y clasificación de cada modo propio por debajo de 300 Hz en axial, tangencial y oblicuo, con la frecuencia de Schröder que separa el régimen modal del estadístico, y marcas para solapamientos modales problemáticos.
3. **Un validador de verificaciones golden** — `make validate` recorre cada verificación que nombra la especificación, la evalúa contra el código vivo con la tolerancia que la especificación declara, y escribe el registro en un archivo de reporte.
4. **Un worker de contraste en Python** — una segunda implementación, en un segundo lenguaje, con NumPy y pyroomacoustics.

## Resultados

El reporte generado registra **78 verificaciones, y las 78 pasan.**

La geometría concuerda dentro del 0,004%. El RT60 sin tratamiento en medias frecuencias da 2,78549 s contra 2,78 s especificados, una desviación del 0,197%. Eyring-Norris se mantiene igual o por debajo de Sabine en todas las bandas de todos los escenarios, como exige la física. El censo modal encuentra **92 modos — 13 axiales, 42 tangenciales, 37 oblicuos** — y ubica la frecuencia de Schröder dentro del 0,07%.

Conviene separar los contrastes, porque no tienen la misma fuerza. El censo **modal** se verifica contra la implementación propia en NumPy del worker, escrita de forma independiente a partir de la ecuación de autovalores: una segunda implementación en un segundo lenguaje, que coincide en los 92 modos con una discrepancia máxima de 0 Hz — pero no una herramienta de terceros. La mitad **estadística** sí es un contraste genuino de terceros: Sabine y Eyring coinciden con pyroomacoustics en los doce pares banda-método con un residuo de **0,000107%**, que es ruido de punto flotante más que coincidencia.

## La verificación que estuvo en rojo, y cómo se cerró

Durante un buen tiempo este reporte mostró 77 de 78, y esa falla era la línea
más informativa que tenía.

La especificación pedía un RT60 en medias frecuencias de 0,40 s ±8% a partir de
un tratamiento acústico declarado. Ese tratamiento daba **0,448 s — 12,007% por
encima.** La aritmética decía que alcanzar 0,40 s requeriría 5,20 m² de lana
mineral donde la especificación indicaba 4,33 m².

El defecto estaba entonces en el valor esperado de la especificación, no en el
motor. Nunca se amplió la tolerancia ni se borró la verificación: quedó en rojo,
con un registro de decisión de arquitectura documentando el cálculo, hasta que
se corrigió la especificación misma. Hoy pasa porque el número contra el que
compara por fin es correcto, no porque se haya bajado la vara para alcanzarlo.

Esa distinción es todo el punto. Un reporte de validación que solo muestra verde
no es evidencia de corrección: es evidencia de que no se dejó que nada
discrepara. Este discrepó, a la vista, todo el tiempo que hizo falta.

## Contribuciones principales

- Un registro de validación generado por máquina, con las tolerancias reproducidas textualmente desde la especificación, en lugar de una afirmación de exactitud en prosa
- Dos oráculos, con su fuerza declarada con honestidad: una biblioteca de terceros para el modelo estadístico, una segunda implementación independiente para el modal
- Una falla rastreada hasta la especificación y cerrada corrigiéndola, en lugar de ampliando la tolerancia que rompía
- Procedencia de los 46 coeficientes de absorción, para que un resultado discutido pueda rastrearse hasta su fuente
- Integración continua que corre el validador en cada push y publica el reporte como artefacto

## Aprendizajes

Construir la segunda implementación valió más que cualquier test individual. Los tests unitarios confirman que el código hace lo que su autor creyó; una segunda implementación, escrita desde la ecuación y no desde la primera implementación, detecta lo que el autor entendió mal. Las dos discreparon al principio, y la discrepancia era real.

La verificación en rojo enseñó la lección más útil. El reflejo ante un resultado que falla es ajustar la tolerancia hasta que pase, y ese reflejo destruye lo único para lo que sirve una suite de validación. Perseguir la discrepancia a través de la aritmética, en cambio, convirtió una molestia en un hallazgo: la especificación pedía algo que su propio tratamiento no podía entregar. Lo que la cerró fue corregir la especificación — que llevó más tiempo que editar una tolerancia, y es la única versión del arreglo que valía algo.
