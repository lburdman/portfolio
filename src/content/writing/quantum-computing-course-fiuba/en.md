---
title: 'Teaching quantum computing at FIUBA'
summary: 'I teach the quantum computing course at the Facultad de Ingeniería of the Universidad de Buenos Aires alongside professor Facundo Caram, and to close my first cuatrimestre Victor Macarrein brought his two-qubit nuclear magnetic resonance quantum computer to the faculty. The students ran real circuits on it, and what came back did not quite match the simulator.'
---

I teach the quantum computing course at the Facultad de Ingeniería of the Universidad de Buenos Aires, alongside professor Facundo Caram. The faculty has its own name for the role — Ayudante de Primera, Computación y Comunicaciones Cuánticas — and I have held it since 2024. The first cuatrimestre I taught was the first time I had stood on that side of a classroom at all.

To close it, Victor Macarrein brought his two-qubit nuclear magnetic resonance quantum computer — a SpinQ desktop unit — to the faculty. It was the first quantum computer ever to be there. The students tested it, and they ran real quantum circuits on it.

## What the students had already done

The course does not run on my talking. Over the cuatrimestre the students presented on different technologies, qubit architectures and quantum programming frameworks: how a qubit can physically be built, what an architecture commits to once it has picked one of those routes, and what the software written to program the result actually looks like.

Preparing that kind of presentation forces a question a lecture lets you avoid, which is why any of it is difficult. A student who has had to explain a qubit architecture out loud, to people who will ask about it, already knows that the difficulty does not live in the algebra. It lives in the hardware, and until that day the hardware had only ever been a photograph.

## Two qubits, honestly

Nuclear magnetic resonance is the same physics as a hospital scanner. The qubits are not fabricated: they are nuclei belonging to a molecule, sitting in a magnetic field where each has two distinguishable orientations, and those two orientations are the two states. A radio-frequency pulse of the right frequency and duration rotates a nuclear spin by a controlled amount, and a controlled rotation is exactly what a quantum gate is. Neighbouring nuclei feel each other through their chemical bonds, and that coupling is what makes a two-qubit gate possible. What comes back out is the faint signal the spins induce in a coil.

Two qubits will not factor anything. It is not going to beat a laptop at any task, and pretending otherwise would spend the one thing the machine is genuinely good for. It is a teaching instrument. Saying that plainly in front of a class is what makes it worth respecting rather than selling: nobody in the room was being asked to take an advertisement on trust.

## The bars that did not match

The circuit on the screen was two gates: an H on the first qubit, then a CNOT onto the second. It is the shortest famous program in the field, and it prepares a Bell pair, the simplest entangled state there is. A student meets it on a whiteboard as an identity. Two outcomes, equal probability, perfectly correlated, and the counts converge on the fractions the algebra promised.

Under the circuit the screen drew a chart labelled Projection Probability, with two sets of bars: Real Result against Simulate Result. The simulated bars are the whiteboard. The real bars are what a set of nuclear spins in a molecule, on a desk, in a room in Buenos Aires, actually did when the pulses were sent.

They did not match perfectly.

That is the lesson, and it does not survive being described. Real qubits lose their quantum state to their environment while you are still working with them, and every pulse sent is very slightly the wrong pulse. Decoherence and gate error stop being glossary entries at the exact moment a student can point at two bars that disagree and ask why. Everything hard about building a quantum computer — error correction, longer coherence times, better control — is an attempt to close a gap of that shape. Standing next to the simulator's bars, the excuse is not available. The mathematics is right there, and the machine did something else.

## Curiosity is the thing being taught

The argument for putting a machine like that in front of a class is not that it computes anything. It is that a circuit a student wrote in a notebook can be run, that the answer comes back imperfect, and that the imperfection has a cause with a name and an entire research field attached to it. The abstraction becomes an instrument. A set of matrices to be manipulated correctly turns into a device that can be interrogated, and a student who has interrogated one tends to go looking for the next question without being set it.

I did the teaching. The part worth reporting is what the students did with a machine that had never been in the building before.
