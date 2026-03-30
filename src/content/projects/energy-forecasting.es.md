---
title: 'Pronóstico de Demanda Energética'
projectSlug: 'energy-forecasting'
summary: 'Un pipeline de pronóstico de demanda eléctrica a 24 horas con ingeniería de características, validación rolling-origin, modelos basados en árboles y estimación de incertidumbre — enfocado en evaluación ML reproducible.'
lang: 'es'
tags: ['Machine Learning', 'Series Temporales', 'Python', 'Scikit-learn', 'Pronóstico', 'XGBoost']
featured: true
status: 'published'
github: 'https://github.com/lburdman/energy-demand-forecasting'
order: 2
---

## Descripción General

Un pipeline completo de machine learning para pronosticar la demanda eléctrica con 24 horas de anticipación. Construido con énfasis en experimentación reproducible, metodología de evaluación práctica y estimación honesta de incertidumbre.

## Problema

El pronóstico de demanda eléctrica a corto plazo es un problema de alto impacto: las predicciones deficientes generan desperdicios, inestabilidad en la red o faltantes. Este proyecto lo trata como un problema de ML aplicado riguroso, no solo como un ejercicio de modelado.

## Pipeline

1. **Ingesta y limpieza de datos**: Manejo de valores faltantes, normalización de zonas horarias y marcado de anomalías.
2. **Ingeniería de características**: Características del calendario, demanda rezagada, estadísticas rodantes y señales derivadas del clima.
3. **Comparación de modelos base**: Persistencia naive, naive estacional y regresión lineal como anclas de evaluación.
4. **Entrenamiento de modelos**: Árboles de gradient boosting (XGBoost, LightGBM) con ajuste de hiperparámetros.
5. **Validación rolling-origin**: Validación cruzada respetando el tiempo para evitar fuga de información futura.
6. **Estimación de incertidumbre**: Regresión de cuantiles para intervalos de predicción.
7. **Dashboard de evaluación**: Interfaz Streamlit para inspección visual de pronósticos y residuos.

## Contribuciones Clave

- Validación rolling-origin rigurosa — no una simple división train/test
- Comparación explícita contra múltiples baselines antes de afirmar el valor del modelo
- Regresión de cuantiles para comunicación honesta de incertidumbre
- Pipeline completamente reproducible con aleatoriedad sembrada e hiperparámetros documentados
