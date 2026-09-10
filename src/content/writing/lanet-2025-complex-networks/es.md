---
title: 'LANET 2025 y un primer póster'
summary: 'LANET 2025, la Latin American Conference on Complex Networks, se realizó en Punta del Este en agosto y fue el primer congreso académico al que asistí. Llevé un póster sobre transfer learning para redes neuronales híbridas clásico-cuánticas, tomado de mi tesis de ingeniería sobre clasificación de emociones en audio.'
---

La Latin American Conference on Complex Networks, LANET 2025, se realizó en Punta del Este, Uruguay, en agosto. Fue el primer congreso académico al que asistí, y no fui como espectador: tenía un póster en la sesión, que es una manera bastante distinta de atravesar un congreso que sentarse en el fondo de una sala.

El póster era "Transfer Learning para Redes Neuronales Híbridas Clásico-Cuánticas", escrito junto a Leónidas Facundo Caram, que dirige mi tesis de ingeniería en la Facultad de Ingeniería de la Universidad de Buenos Aires. El trabajo se desarrolla en el Laboratorio de Redes y Sistemas Móviles (LRSyM).

## Qué proponía el póster

Detrás está la tesis "Redes Neuronales Híbridas Clásico–Cuánticas para Clasificación de Emociones en Audio", de la carrera de Ingeniería Electrónica en FIUBA. El póster la condensaba en cinco paneles: objetivo, introducción, arquitectura del modelo híbrido, caso de uso y conclusiones, acompañados por un diagrama del circuito cuántico variacional y las curvas de accuracy del entrenamiento.

El caso de uso era la clasificación binaria de emociones en habla, sobre el dataset CREMA-D. El pipeline empieza convirtiendo cada grabación en un mel-espectrograma: una imagen de cómo se distribuye la energía entre bandas de frecuencia a lo largo del tiempo, en una escala que sigue la audición humana en lugar de los hertz crudos. Una vez que el audio es una imagen, el problema pasa a ser uno al que se le puede apuntar un modelo de visión.

Ahí entra el transfer learning. En lugar de entrenar una red desde cero con unos pocos miles de clips, la extracción de características queda a cargo de una red clásica ya entrenada sobre un corpus mucho mayor, y solo la etapa final se entrena para esta tarea. Lo inusual es qué es esa etapa final. En vez de una cabeza de clasificación clásica, el modelo termina en un circuito cuántico variacional: un circuito pequeño cuyos ángulos de rotación son parámetros entrenables. Las características que salen del extractor clásico se codifican en qubits, el circuito se ejecuta, las mediciones vuelven convertidas en una clasificación y el gradiente atraviesa todo el conjunto, de modo que los ángulos del circuito se aprenden igual que los pesos de la red. Las capas clásicas hacen el trabajo perceptual pesado; la capa cuántica decide. PyTorch y PennyLane son los que vuelven practicable ese entrenamiento conjunto.

El experimento era el centro del trabajo. Los modelos híbridos se compararon contra baselines totalmente clásicos bajo restricciones computacionales equiparadas, para que lo medido fuera la arquitectura y no los recursos volcados sobre ella. No voy a citar un número acá, y la afirmación del póster es más acotada que la que suele ofrecerse en este campo: las dos familias quedaron en igualdad de condiciones y se midieron una contra la otra. El resto está en la ficha del proyecto.

## Estar parado al lado

Una sesión de pósters no es una charla. Nadie se queda del principio al final. La gente pasa, se detiene si el título la retiene y después pregunta lo que quiere en el orden que quiere, lo cual significa que a uno lo examinan sobre las partes que menos preparó y no sobre las que ensayó.

La respuesta fue mejor de lo que esperaba, y la sorpresa se repitió lo suficiente como para dejarla anotada: nadie esperaba una tesis de ingeniería que primero explicara los fundamentos de la computación cuántica y después los aplicara a machine learning. Para buena parte de la sala esas son dos especializaciones separadas, y verlas en un mismo trabajo fue lo que hizo que la gente se detuviera.

## El resto del programa

LANET es un congreso de redes complejas, así que la mayor parte de lo que escuché no era cuántico. Las charlas abarcaron análisis de redes multicapa —sistemas donde el mismo conjunto de nodos está conectado de varias formas a la vez, y donde tratar cada capa por separado pierde exactamente la interacción que interesa— y dinámica de epidemias, que es lo que ocurre cuando se corre un proceso de propagación sobre esa estructura. Las aplicaciones iban desde sistemas sociales hasta neurociencia.

Me fui con una pregunta antes que con una conclusión. Los métodos que escuché durante esas sesiones describen estructura, y los que trabajo operan sobre ella; dónde se encuentran esas dos cosas todavía no me resulta evidente, y esa es la parte que me gustaría averiguar en lo que venga después de la tesis.
