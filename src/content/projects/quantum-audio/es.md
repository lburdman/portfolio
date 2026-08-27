---
title: 'Redes Neuronales Clásico-Cuánticas Híbridas para Clasificación de Emociones en Audio'
summary: 'Un pipeline de reconocimiento de emociones en voz sobre CREMA-D con mel-espectrogramas, backbones preentrenados congelados y una cabeza cuántica variacional — con inferencia seleccionada reejecutada en hardware real de IBM Quantum.'
---

## Resumen

Un pipeline de investigación de extremo a extremo para el reconocimiento de emociones en voz sobre el conjunto CREMA-D. La contribución central es una comparación controlada entre una cabeza clasificadora clásica y una cabeza cuántica variacional, ambas entrenadas sobre el mismo backbone clásico congelado.

## El problema

El machine learning cuántico es un campo con una promesa teórica considerable y una validación empírica escasa bajo restricciones reales. El proyecto plantea una pregunta concreta: ¿puede una cabeza construida con un circuito cuántico variacional competir con una cabeza clásica — o superarla — en una tarea de clasificación de audio, si ambas reciben exactamente las mismas características y el circuito es lo bastante chico como para correr en el hardware actual?

## Pipeline

1. **Preparación de datos**: clips de audio de CREMA-D convertidos en mel-espectrogramas de longitud fija, MFCCs y embeddings precalculados.
2. **Extracción de características**: un backbone preentrenado — ResNet18, VGG16 o PANNs CNN14 — produce representaciones compactas del audio.
3. **Proyección a escala de qubits**: una cabeza entrenable pequeña (Linear → ReLU → Linear → ReLU) reduce la representación del backbone a `n_qubits` valores, el ancho de entrada que admite un circuito de este tamaño.
4. **Referencia con cabeza clásica**: un clasificador MLP entrenado sobre las características proyectadas.
5. **Cabeza cuántica**: un circuito variacional formado por `AngleEmbedding` y `BasicEntanglerLayers`, envuelto como un `TorchLayer` de PennyLane y usado como cabeza clasificadora.
6. **Entrenamiento en dos etapas**: el backbone y el proyector se preentrenan con un clasificador lineal y luego se congelan; en la segunda etapa se ajusta únicamente la cabeza elegida, clásica o cuántica.
7. **Verificación en hardware**: los pesos y las entradas del circuito se exportan y se vuelven a ejecutar en una QPU real de IBM mediante Qiskit Runtime. El notebook publicado muestra el circuito transpilado para `ibm_kingston`, junto al mismo circuito sobre un simulador local.

## Decisiones de diseño

- **Comparación controlada**: ambas cabezas se apoyan en el mismo backbone congelado y en el mismo ancho de proyección, así que el tipo de cabeza es la única variable.
- **Restricciones de recursos reales**: la cantidad de qubits y la profundidad del circuito se mantienen dentro de lo que el hardware actual puede ejecutar, y el proyector existe precisamente para respetar ese límite.
- **Transfer learning para las representaciones**: un backbone preentrenado y congelado evita que el circuito tenga que lidiar con audio crudo — una necesidad práctica con la cantidad de qubits disponible hoy, no un atajo.
- **Integración de PennyLane con PyTorch**: `TorchLayer` permite que los gradientes atraviesen el modelo híbrido dentro de un bucle de entrenamiento común de PyTorch.
- **Artefactos cuánticos exportados**: los pesos, las entradas y los metadatos del circuito se exportan y se cubren con pruebas unitarias de reconstrucción, que es lo que hace posible la reejecución en hardware.

## Conclusiones

El factor limitante no es algorítmico: es el ruido del hardware y la cantidad acotada de qubits. La reducción de dimensionalidad es una necesidad práctica, no una optimización: el circuito fija el ancho de entrada y todo lo que viene antes tiene que ajustarse a él. Ejecutar el mismo circuito en simulación y en un dispositivo real es el punto en el que la diferencia entre ambos deja de ser teórica.
