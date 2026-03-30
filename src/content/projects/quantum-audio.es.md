---
title: "Redes Neuronales Clásico-Cuánticas Híbridas para Clasificación de Emociones en Audio"
projectSlug: "quantum-audio"
summary: "Un pipeline de reconocimiento de emociones en voz sobre CREMA-D usando mel-spectrogramas, transfer learning y cabezas cuánticas/clásicas híbridas — enfocado en experimentación controlada bajo restricciones de recursos reales."
lang: "es"
tags: ["Quantum ML", "PyTorch", "PennyLane", "Procesamiento de Audio", "Deep Learning", "CREMA-D"]
featured: true
status: "published"
github: "https://github.com/lburdman/qnn-speech-recognition"
order: 3
---

## Descripción General

Un pipeline de investigación de extremo a extremo para el reconocimiento de emociones en voz usando el dataset CREMA-D. La contribución central es una comparación sistemática entre arquitecturas de redes neuronales clásicas e híbridas cuánticas/clásicas bajo condiciones controladas y realistas en cuanto a recursos.

## Problema

El machine learning cuántico es un campo con una promesa teórica significativa pero con validación empírica limitada bajo restricciones realistas. Este proyecto pregunta: ¿pueden los modelos híbridos cuánticos/clásicos competir con — o mejorar — los baselines clásicos en una tarea de clasificación de audio cuando los recursos son limitados?

## Pipeline

1. **Preparación de datos**: Clips de audio de CREMA-D preprocesados en representaciones de mel-spectrogramas de longitud fija.
2. **Extracción de características**: Backbone CNN pre-entrenado (transfer learning) para extraer embeddings de audio compactos.
3. **Reducción de dimensionalidad**: PCA aplicado para mapear los embeddings al espacio pequeño compatible con qubits requerido por los circuitos cuánticos.
4. **Baseline cabeza clásica**: Clasificador fully connected entrenado en los embeddings reducidos.
5. **Cabeza cuántica**: Circuito cuántico parametrizado (PQC) implementado en PennyLane, actuando como cabeza clasificadora.
6. **Modelo híbrido**: Backbone CNN → reducción de dimensionalidad → cabeza PQC, entrenado de extremo a extremo.
7. **Verificación en hardware**: Experimentos seleccionados ejecutados en hardware de IBM Quantum para validar el comportamiento en dispositivos reales vs. simulación.

## Lecciones Clave

El factor limitante no es algorítmico — es el ruido del hardware y el número limitado de qubits. La reducción de dimensionalidad es una necesidad práctica, no una optimización. Los resultados proporcionan un benchmark empírico honesto para modelos híbridos en los niveles de capacidad actuales del hardware.
