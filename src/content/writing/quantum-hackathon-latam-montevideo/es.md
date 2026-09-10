---
title: 'Quantum Hackathon LATAM 2025 en Montevideo'
summary: 'El Quantum Hackathon LATAM 2025 se realizó en la Universidad de Montevideo del 1 al 3 de octubre bajo el lema Quantum for Climate, con 80 participantes de 10 países trabajando en tres idiomas. Pasé esos tres días en el equipo 5, Q-Forest, que formuló la reforestación de la Amazonía como un problema de la mochila y lo resolvió con una relajación clásica redondeada mediante QAOA.'
---

El Quantum Hackathon LATAM 2025 se realizó del 1 al 3 de octubre en la Universidad de Montevideo, Uruguay. Los organizadores lo describen como el primer hackathon internacional de computación cuántica organizado en América Latina, y le dieron un tema en lugar de una consigna abierta: Quantum for Climate.

Fue impulsado por la Universidad de Montevideo junto con el Open Quantum Institute (OQI) y patrocinado por Microsoft, con la colaboración de ANTEL, IEEE Quantum y qBraid, y el apoyo de RIPAISC, CLEI, ANII, que le otorgó una Declaración de Interés Nacional, UNESCO, el Año Internacional de la Ciencia y la Tecnología Cuánticas, IEEE Región 9 y Uruguay Natural, que le otorgó una Declaración de Interés Turístico. Los tres días alternaron sesiones de trabajo colaborativo con presentaciones intermedias, un panel de expertos internacionales y actividades culturales. Cada equipo respondió a uno de tres Objetivos de Desarrollo Sostenible de las Naciones Unidas: 6, Agua Limpia y Saneamiento; 11, Ciudades y Comunidades Sostenibles; y 13, Acción por el Clima. Yo estuve en el equipo 5, Q-Forest, y respondimos al ODS 11.

## La reforestación como problema de la mochila

Lo que construimos fue un sistema para optimizar la reforestación en la Amazonía a partir de datos geoespaciales. La pregunta que hay debajo es concreta y acotada. Dado un conjunto de parcelas candidatas, cada una con un costo estimado de plantación y una cantidad estimada de CO₂ que capturaría con el tiempo, ¿cuáles se plantan cuando no alcanza el presupuesto para todas?

Ese es el problema de la mochila, uno de los objetos menos indulgentes de la optimización combinatoria. Cada parcela es un sí o un no, de modo que la cantidad de planes posibles se duplica con cada parcela que se agrega, y ordenar las parcelas por captura por unidad de costo es una heurística que se puede superar. La mochila es NP-difícil: más allá de una instancia pequeña, nadie la resuelve de forma exacta. Se la aproxima, y la pregunta pasa a ser qué tan buena es la aproximación.

## Una relajación y después el redondeo

Nuestro algoritmo era híbrido, y la división del trabajo es la parte que conviene entender.

La mitad clásica fue una relajación semidefinida. Relajar un problema significa aflojar la restricción que lo vuelve difícil: en lugar de obligar a cada parcela a ser un sí o un no, se le permite tomar cualquier valor intermedio, y la búsqueda combinatoria se convierte en una optimización continua que los solvers convexos manejan bien. La respuesta que devuelve es buena y a la vez inservible, porque indica plantar 0,63 de una parcela. Una relajación compra información sobre la forma del problema, no un plan.

Convertir esa respuesta continua en un conjunto concreto de parcelas se llama redondeo, y ahí se decide la calidad del plan final. Un redondeo descuidado o excede el presupuesto o descarta la mayor parte de lo que la relajación había indicado. Esa fue la tarea que le dimos a QAOA, el Algoritmo Cuántico de Optimización Aproximada. QAOA prepara un estado cuántico cuyos resultados de medición son planes candidatos, alternando una operación que carga la función objetivo con otra que mezcla entre planes, y un optimizador clásico ajusta los ángulos intermedios para que medir devuelva buenos planes con alta probabilidad. Es una aproximación por construcción.

El modelo se ejecutó en el simulador Qiskit Aer sin ruido, y fue diseñado para hardware de IBM Quantum. Esa distinción importa. Una simulación sin ruido es una afirmación sobre el algoritmo, no sobre lo que devolvería una máquina disponible hoy: dice que la formulación es sólida y que el flujo que va de los datos geoespaciales a un plan de plantación se sostiene de punta a punta. El hardware real agrega decoherencia y error de compuerta, que es justamente el término que este resultado no contiene.

## Lo que dicen los números

La inscripción cerró con 380 estudiantes de grado y posgrado, de 21 países y 86 universidades. De ellos, 157 completaron el curso preparatorio de QWorld. Lo que llegó a Montevideo fueron 80 participantes de 40 universidades y 10 países, trabajando en 8 equipos y en tres idiomas: español, inglés y portugués. Uruguay representó el 22,5 por ciento de los participantes, Brasil y Perú el 13,8 cada uno, Colombia el 11,3, Argentina y Chile el 10 cada uno, Costa Rica el 6,3, México el 5, y Ecuador y Paraguay el 3,8.

Una sala con esas proporciones no existía antes en esta forma, y eso es lo que sostiene la palabra primero. Casi cuatrocientos estudiantes de la región quisieron entrar, y 157 de ellos hicieron un curso de cuántica en su propio tiempo para prepararse para un fin de semana.

## Los resultados

Miqro obtuvo el primer puesto, Q-Enso el segundo y GQG, Green Quantum Grids, el tercero. QBrigade recibió el Premio a la Sostenibilidad. Q-Forest no obtuvo ningún puesto, y prefiero dejarlo escrito antes que escribir alrededor del tema.

Q-Forest fue Ariana Camila López Julcarima, Cesar Augusto do Amaral, Daglio Matías Agustín, Daniel Eduardo Zuluaga Escobar, Diogo Fernando Santos Lacerda da Silva, Estefany Beatriz Bica Curbelo, Jose Alessandro Quispe Cabello, Mateo Vidal, Tomás Crosta y yo. Diez personas de varios países que no se conocían antes del miércoles, poniéndose de acuerdo para el viernes sobre una formulación, un solver y qué podía afirmar el modelo.
