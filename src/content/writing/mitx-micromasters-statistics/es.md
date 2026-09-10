---
title: 'Terminar el MicroMasters de MITx en Estadística y Ciencia de Datos'
summary: 'Terminé los cuatro cursos del MicroMasters de MITx en Estadística y Ciencia de Datos en edX: Probability, Fundamentals of Statistics, Machine Learning with Python: From Linear Models to Deep Learning y 6.419x Data Analysis: Statistical Modeling and Computation in Applications. Acá está lo que contenían realmente esos cursos, y sobre qué parte de ellos se apoya el proyecto de pronóstico de demanda eléctrica que está en este sitio.'
---

Terminé los cuatro cursos del MicroMasters en Statistics and Data Science que MITx dicta en edX, que empecé en 2024. Son Probability; Fundamentals of Statistics; Machine Learning with Python: From Linear Models to Deep Learning, que anuncia su propio recorrido en el título; y Data Analysis: Statistical Modeling and Computation in Applications, catalogado como 6.419x. La credencial es lo menos interesante del asunto. Lo que contenían los cursos sí vale la pena anotarlo.

## Inferencia antes que modelos

Fundamentals of Statistics es el que cambió la manera en que leo un resultado, propio o ajeno. Salí de él con 98%. Cubre inferencia estadística y los métodos de estimación que la sostienen, tests de hipótesis paramétricos y no paramétricos, modelos lineales y regresión, estimación por máxima verosimilitud, e intervalos de confianza y p-valores: justamente las dos cantidades que más se citan y menos se entienden. El valor del curso está en que vuelve derivables esas cosas en lugar de citables. Una vez que uno construyó un intervalo de confianza a partir de sus supuestos, ya no puede informar uno sin saber qué supuestos acaba de tomar prestados.

## Cuatro dominios, un problema en cada uno

6.419x es el curso aplicado, y está armado como cuatro encuentros separados con datos reales en lugar de un programa continuo. Salí de él con 97%.

El primero es genómica, donde la dificultad es que los datos tienen más dimensiones de las que alguien puede mirar: PCA, MDS y t-SNE para reducirlas y visualizarlas, y el trabajo más difícil de decidir qué puede afirmar legítimamente una imagen de datos de alta dimensión. El segundo son redes criminales, tratadas como grafos, donde las medidas de centralidad son las herramientas para preguntar qué nodos importan y por qué. El tercero es precios, economía y series temporales: pronóstico con modelos estacionarios, de medias móviles y autorregresivos, y después la verificación de esos modelos sobre datos de tipo financiero en lugar de la confianza ciega en ellos. El cuarto son datos ambientales y estadística espacial, donde los procesos gaussianos modelan una magnitud a lo largo del espacio y cada predicción llega con su incertidumbre cuantificada y no enunciada al pasar.

## Dónde terminó el cuarto curso

El proyecto de pronóstico de demanda eléctrica que está en este sitio se apoya en esos dos últimos dominios. El módulo de series temporales es de donde viene el vocabulario: estacionariedad, estructura autorregresiva y de medias móviles, y la disciplina de verificar un pronóstico interrogando lo que queda en sus residuos en vez de leer un único error de titular. Del módulo espacial viene el segundo hábito: que una predicción sin un intervalo alrededor es una respuesta incompleta. Los baselines del proyecto, sus diagnósticos de residuos y sus intervalos de predicción son esa materia llegando a un lugar donde tenía que sostenerse.

Esa es la conclusión que me llevo de los cuatro cursos. Un buen análisis de datos no consiste en correr modelos. Consiste en hacer la pregunta correcta, elegir un método de manera deliberada y poder explicar por qué ese, y convertir lo que vuelve en una conclusión sobre la que alguien pueda actuar.
