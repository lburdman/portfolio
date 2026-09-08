---
title: 'Qiskit Fall Fest FIUBA 2025'
summary: "The Qiskit Fall Fest FIUBA 2025 opened on Friday 31 October with 436 people registered, and ran a month of talks and workshops through November. It closed with a hackathon in the faculty library, where teams wrote Grover's algorithm from scratch in Qiskit to open a quantum vault."
---

The Qiskit Fall Fest FIUBA 2025 opened on Friday 31 October. By then 436 people had registered, and registrations kept arriving after the opening day. What followed was a month of talks and workshops through November, and a hackathon in the faculty library to close it.

Qiskit Fall Fest is an initiative driven by IBM Quantum that connects students, researchers and quantum computing enthusiasts worldwide. Each edition is put together locally, by the people who want one where they are. Ours ran at the Facultad de Ingeniería of the Universidad de Buenos Aires, and I was one of its organisers.

## The opening day

Three talks opened the festival.

Julio Cella, IBM Quantum Ambassador, spoke on "The Era of Quantum Utility". Alan Boette, a professor at UNLP, asked "¿Emerge el tiempo a partir del entrelazamiento cuántico?" — whether time emerges from quantum entanglement. Alejandro Giraldo, from QNOW, spoke on "Computación Cuántica Aplicada a Life & Materials Sciences".

Some of the sessions were run in English, which is the language most of this field is published in anyway.

## Operación Caja Fuerte Cuántica

The festival closed with a hackathon in the faculty library. The challenge had a name — Operación Caja Fuerte Cuántica, Quantum Vault Operation — and a single objective: open a quantum vault.

The way in was a quantum search, written from scratch in Qiskit and based on Grover's algorithm. Each team had to define its own search space, design its own oracle, implement the diffuser, run the circuits and compare the results. From scratch is the part that mattered. There was no ready-made routine to call, so every team had to decide what a combination was, how a correct one could be recognised by a circuit, and how many times to repeat the amplification before measuring.

Victor Macarrein brought his quantum computer to the library so the teams could see one up close.

## What Grover's algorithm does

Grover's algorithm solves unstructured search. Picture a lock with a large number of possible combinations and no structure to exploit: no hint that gets you closer, no way to rule out half the space. Classically there is nothing to do but try combinations one at a time.

The quantum version starts by putting the register into a superposition of every possible combination at once, all equally likely. Then two circuits run in turn.

The first is the oracle. It encodes the condition the correct combination satisfies, and it marks the state that satisfies it by flipping that state's sign while leaving every other state alone. Nothing is revealed by this — a sign is not something you can measure. Writing the oracle is the part that demands the most thought, because the condition has to be expressed in gates.

The second is the diffuser, which reflects the whole state about its average amplitude. This is what turns the invisible sign flip into a visible difference: the marked state grows, the unmarked ones shrink. Run the pair again and the gap widens. The wrong answers interfere destructively, the right one interferes constructively, and after roughly the square root of the number of combinations, measuring the register returns the correct answer with high probability.

It is worth being precise about the size of that advantage, because it is routinely oversold. Grover does not make search instant and it is not an exponential speedup; it is a quadratic one, and on a real machine it competes against noise. Which is exactly why running the circuits and comparing the results was part of the challenge rather than an afterthought: a distribution that does not look like the one you designed is the most instructive output a first quantum program produces.

## The people who ran it

The hackathon was organised by Julián Melmer Stiefkens, Martín González Prieto and me. The wider festival was organised alongside Facundo Caram, Cielo Sanchez Dahy, Diego Tielas and Pablo Conte. Pablo Conte, Facundo Caram and Diego Tielas also acted as support and as the jury during the hackathon.

It ran with the support of the faculty: Alejandro Manuel Martinez, the dean, Ricardo Veiga, and the faculty's non-teaching staff. The sponsors were QuantumRev, Tecmaco Integral S.A., INVAP and Packt.

The month had one further consequence. The interest the festival generated got the faculty invited to La Noche de los Museos on 8 November, where a hundred years of quantum mechanics — and a two-qubit machine — were put in front of the public.
