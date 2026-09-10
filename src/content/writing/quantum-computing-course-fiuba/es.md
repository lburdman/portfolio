---
title: 'Enseñar computación cuántica en FIUBA'
summary: 'Doy la materia de computación cuántica en la Facultad de Ingeniería de la Universidad de Buenos Aires junto al profesor Facundo Caram, y para cerrar mi primer cuatrimestre Victor Macarrein llevó a la facultad su computadora cuántica de dos qubits basada en resonancia magnética nuclear. Los estudiantes corrieron circuitos reales en ella, y lo que devolvió no coincidió del todo con el simulador.'
---

Doy la materia de computación cuántica en la Facultad de Ingeniería de la Universidad de Buenos Aires, junto al profesor Facundo Caram. La facultad tiene su propio nombre para el cargo — Ayudante de Primera, Computación y Comunicaciones Cuánticas — y lo ocupo desde 2024. El primer cuatrimestre que di clase fue la primera vez que estuve de ese lado del aula.

Para cerrarlo, Victor Macarrein llevó a la facultad su computadora cuántica de dos qubits basada en resonancia magnética nuclear, una SpinQ de escritorio. Fue la primera computadora cuántica que hubo allí. Los estudiantes la probaron y corrieron circuitos cuánticos reales en ella.

## Lo que los estudiantes ya habían hecho

La materia no se sostiene sobre lo que yo hablo. A lo largo del cuatrimestre los estudiantes expusieron sobre distintas tecnologías, arquitecturas de qubits y frameworks de programación cuántica: cómo se puede construir físicamente un qubit, a qué se compromete una arquitectura una vez que eligió uno de esos caminos, y qué forma tiene realmente el software que se escribe para programarlo.

Preparar una exposición así obliga a hacerse una pregunta que una clase magistral permite esquivar: por qué todo esto es difícil. Quien tuvo que explicar en voz alta una arquitectura de qubits, frente a gente que le va a preguntar, ya sabe que la dificultad no está en el álgebra. Está en el hardware, y hasta ese día el hardware había sido solamente una fotografía.

## Dos qubits, sin exagerar

La resonancia magnética nuclear es la misma física que la de un resonador de hospital. Los qubits no se fabrican: son núcleos de una molécula, ubicados en un campo magnético donde cada uno tiene dos orientaciones distinguibles, y esas dos orientaciones son los dos estados. Un pulso de radiofrecuencia con la frecuencia y la duración adecuadas rota el espín nuclear una cantidad controlada, y una rotación controlada es exactamente lo que hace una compuerta cuántica. Los núcleos vecinos se sienten entre sí a través de sus enlaces químicos, y ese acoplamiento es lo que permite una compuerta de dos qubits. Lo que sale es la señal débil que los espines inducen en una bobina.

Dos qubits no van a factorizar nada. Tampoco van a superar a una computadora portátil en ninguna tarea, y fingir lo contrario gastaría lo único para lo que la máquina sirve de verdad. Es un instrumento de enseñanza. Decirlo con claridad frente a un curso es lo que la vuelve respetable en lugar de vendible: nadie en el aula tuvo que creerle a un anuncio.

## Las barras que no coincidieron

El circuito en la pantalla eran dos compuertas: una H sobre el primer qubit y después una CNOT sobre el segundo. Es el programa corto más conocido del campo, y prepara un par de Bell, el estado entrelazado más simple que existe. Un estudiante lo conoce primero en el pizarrón, como una identidad. Dos resultados, igual probabilidad, correlación perfecta, y las cuentas convergen a las fracciones que prometió el álgebra.

Debajo del circuito la pantalla dibujaba un gráfico rotulado Projection Probability, con dos series de barras: Real Result contra Simulate Result. Las barras simuladas son el pizarrón. Las barras reales son lo que hicieron efectivamente unos espines nucleares de una molécula, sobre un escritorio, en una sala de Buenos Aires, cuando se enviaron los pulsos.

No coincidieron del todo.

Esa es la lección, y no sobrevive a ser contada. Los qubits reales pierden su estado cuántico frente al entorno mientras uno todavía está trabajando con ellos, y cada pulso enviado es apenas distinto del pulso ideal. La decoherencia y el error de compuerta dejan de ser entradas de un glosario en el momento exacto en que un estudiante puede señalar dos barras que no coinciden y preguntar por qué. Todo lo difícil de construir una computadora cuántica —corrección de errores, tiempos de coherencia más largos, mejor control— es un intento de cerrar una diferencia de esa forma. Al lado de las barras del simulador no queda excusa disponible. La matemática está ahí mismo, y la máquina hizo otra cosa.

## Lo que en realidad se enseña es curiosidad

El argumento para poner una máquina así frente a un curso no es que compute algo. Es que un circuito que un estudiante escribió en su cuaderno se puede ejecutar, que la respuesta vuelve imperfecta, y que esa imperfección tiene una causa con nombre y con un campo de investigación entero detrás. La abstracción se vuelve un instrumento. Un conjunto de matrices que había que manipular correctamente pasa a ser un dispositivo al que se le puede preguntar, y quien le preguntó una vez suele salir a buscar la pregunta siguiente sin que se la asignen.

La clase la di yo. Lo que vale la pena contar es lo que hicieron los estudiantes con una máquina que nunca antes había estado en el edificio.
