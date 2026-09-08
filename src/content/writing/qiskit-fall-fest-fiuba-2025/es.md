---
title: 'Qiskit Fall Fest FIUBA 2025'
summary: 'El Qiskit Fall Fest FIUBA 2025 abrió el viernes 31 de octubre con 436 personas inscriptas y sostuvo un mes de charlas y talleres durante noviembre. Cerró con una hackathon en la biblioteca de la facultad, donde los equipos escribieron el algoritmo de Grover desde cero en Qiskit para abrir una caja fuerte cuántica.'
---

El Qiskit Fall Fest FIUBA 2025 abrió el viernes 31 de octubre. Para ese día había 436 personas inscriptas, y las inscripciones siguieron llegando después de la apertura. Lo que vino a continuación fue un mes de charlas y talleres durante noviembre, y una hackathon en la biblioteca de la facultad para cerrar.

El Qiskit Fall Fest es una iniciativa impulsada por IBM Quantum que conecta a estudiantes, investigadores y entusiastas de la computación cuántica de todo el mundo. Cada edición se arma localmente, por quienes quieren tener una donde están. La nuestra se hizo en la Facultad de Ingeniería de la Universidad de Buenos Aires, y fui uno de sus organizadores.

## La jornada de apertura

Tres charlas abrieron el festival.

Julio Cella, IBM Quantum Ambassador, habló sobre "The Era of Quantum Utility". Alan Boette, profesor de la UNLP, se preguntó "¿Emerge el tiempo a partir del entrelazamiento cuántico?". Alejandro Giraldo, de QNOW, presentó "Computación Cuántica Aplicada a Life & Materials Sciences".

Algunas de las sesiones se dictaron en inglés, que es el idioma en el que se publica la mayor parte de este campo.

## Operación Caja Fuerte Cuántica

El festival cerró con una hackathon en la biblioteca de la facultad. El desafío tenía nombre propio, Operación Caja Fuerte Cuántica, y un único objetivo: abrir una caja fuerte cuántica.

La entrada era una búsqueda cuántica, escrita desde cero en Qiskit y basada en el algoritmo de Grover. Cada equipo tuvo que definir su propio espacio de búsqueda, diseñar su propio oráculo, implementar el difusor, correr los circuitos y comparar los resultados. Lo importante era justamente el desde cero. No había una rutina lista para invocar, así que cada equipo tuvo que decidir qué era una combinación, cómo podía reconocerla un circuito y cuántas veces repetir la amplificación antes de medir.

Victor Macarrein llevó su computadora cuántica a la biblioteca para que los equipos pudieran verla de cerca.

## Qué hace el algoritmo de Grover

El algoritmo de Grover resuelve búsqueda no estructurada. Imaginemos una cerradura con una gran cantidad de combinaciones posibles y sin ninguna estructura que aprovechar: ninguna pista que acerque, ninguna forma de descartar la mitad del espacio. De forma clásica no hay más opción que probar las combinaciones una por una.

La versión cuántica empieza poniendo el registro en una superposición de todas las combinaciones posibles a la vez, todas igual de probables. Después se alternan dos circuitos.

El primero es el oráculo. Codifica la condición que cumple la combinación correcta y marca el estado que la cumple invirtiendo su signo, sin tocar los demás. Eso no revela nada por sí solo: un signo no es algo que se pueda medir. Escribir el oráculo es la parte más exigente, porque la condición tiene que quedar expresada en compuertas.

El segundo es el difusor, que refleja todo el estado alrededor de su amplitud promedio. Ahí es donde el cambio de signo invisible se vuelve una diferencia visible: el estado marcado crece y los demás se achican. Si se repite el par, la brecha se ensancha. Las respuestas incorrectas interfieren destructivamente, la correcta interfiere constructivamente y, después de aproximadamente la raíz cuadrada de la cantidad de combinaciones, medir el registro devuelve la respuesta correcta con alta probabilidad.

Conviene ser preciso con el tamaño de esa ventaja, porque suele exagerarse. Grover no vuelve instantánea la búsqueda ni ofrece una mejora exponencial: la mejora es cuadrática, y en una máquina real compite contra el ruido. Por eso correr los circuitos y comparar los resultados era parte del desafío y no un trámite final: una distribución que no se parece a la que uno diseñó es la salida más instructiva que puede dar un primer programa cuántico.

## Quiénes lo hicieron

La hackathon la organizamos Julián Melmer Stiefkens, Martín González Prieto y yo. El festival en su conjunto se organizó junto a Facundo Caram, Cielo Sanchez Dahy, Diego Tielas y Pablo Conte. Pablo Conte, Facundo Caram y Diego Tielas además acompañaron y fueron jurado durante la hackathon.

Todo se sostuvo con el apoyo de la facultad: Alejandro Manuel Martinez, decano, Ricardo Veiga y el personal no docente de la facultad. Los sponsors fueron QuantumRev, Tecmaco Integral S.A., INVAP y Packt.

El mes dejó además otra consecuencia. Por el interés que generó el festival, la facultad fue invitada a La Noche de los Museos del 8 de noviembre, donde cien años de mecánica cuántica, y una máquina de dos qubits, quedaron a la vista del público.
