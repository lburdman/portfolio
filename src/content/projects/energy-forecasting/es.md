---
title: 'Pronóstico de Demanda Energética'
summary: 'Un pipeline de pronóstico de demanda eléctrica a 24 horas con ingeniería de características sin fuga de información, validación rolling-origin, modelos de árboles e intervalos por predicción conforme — enfocado en evaluación reproducible.'
---

## Resumen

Un pipeline completo de machine learning para pronosticar la demanda eléctrica alemana con 24 horas de anticipación, construido sobre la serie horaria de carga de Open Power System Data. El énfasis está puesto en la experimentación reproducible, la metodología de evaluación y una estimación honesta de la incertidumbre.

## El problema

El pronóstico de demanda eléctrica a corto plazo es un problema de alto impacto: una predicción deficiente se traduce en desperdicio, inestabilidad de la red o faltantes. El proyecto lo trata como un problema riguroso de ML aplicado, no como un ejercicio de modelado.

## Pipeline

1. **Ingesta y limpieza**: carga horaria alemana de OPSD, llevada a un índice UTC ordenado, con los huecos completados por interpolación temporal.
2. **Ingeniería de características**: variables de calendario (hora, día de la semana, mes, indicador de fin de semana), rezagos en t−1, t−24 y t−168, y media y desvío móviles sobre ventanas de 24 y 168 horas — cada ventana desplazada un paso hacia atrás para que ningún valor presente se filtre en su propia característica.
3. **Modelos de referencia**: un pronóstico naive de rezago 24 y una regresión Ridge escalada, usados como anclas de comparación.
4. **Entrenamiento**: Random Forest y XGBoost, con hiperparámetros fijos y escritos en el código en lugar de ajustados dentro de un notebook.
5. **Validación rolling-origin**: cinco pliegues sucesivos de 720 horas cada uno — validación cruzada que respeta el orden temporal y no puede mirar hacia adelante.
6. **Estimación de incertidumbre**: predicción conforme por división — el cuantil de los residuos absolutos del conjunto de calibración se convierte en un intervalo del 95 % alrededor de cada pronóstico.
7. **Tablero de evaluación**: una interfaz en Streamlit para inspeccionar visualmente pronósticos y residuos.

## Resultados

Sobre una partición cronológica 80/20, XGBoost alcanza **RMSE 2238.99, MAE 1482.16 y MAPE 0.0291**, frente a un modelo naive de rezago 24 con **RMSE 8993.08** y a una Ridge con **RMSE 5016.67**: cerca de una reducción de cuatro veces respecto del ancla naive. Random Forest queda en la misma franja (RMSE 2258.22), así que la mejora viene de pasar a modelos de árboles, no de XGBoost en particular.

## Contribuciones principales

- Validación rolling-origin sobre cinco pliegues, en lugar de una única partición train/test
- Comparación explícita contra un modelo naive y uno lineal antes de atribuirle valor al modelo
- Intervalos por predicción conforme — cobertura sin supuestos de distribución, algo que importa acá porque los residuos tienen colas pesadas
- Diagnóstico de residuos con Ljung-Box, ACF, ADF y gráficos QQ, en vez de una sola métrica de titular
- Aleatoriedad sembrada e hiperparámetros en el código, de modo que una corrida se puede reproducir

## Conclusiones

La decisión de diseño más importante fue la estrategia de validación. La evaluación rolling-origin deja a la vista modos de falla que una partición única no muestra: el RMSE por pliegue de los modelos de árboles va de unos 1300 a unos 3400, así que una partición arbitraria habría exagerado o castigado el resultado según dónde cayera. El diagnóstico de residuos aportó la otra mitad del valor: la autocorrelación que queda en el error apunta a factores que el conjunto de características no incorpora. Los calendarios de feriados y la temperatura son los candidatos evidentes, y ambos siguen siendo trabajo pendiente.
