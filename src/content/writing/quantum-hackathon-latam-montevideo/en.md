---
title: 'Quantum Hackathon LATAM 2025 in Montevideo'
summary: 'The Quantum Hackathon LATAM 2025 met at the Universidad de Montevideo from 1 to 3 October under the heading Quantum for Climate, with 80 participants from 10 countries working in three languages. I spent those three days on Team 5, Q-Forest, which formulated Amazon reforestation as a knapsack problem and solved it with a classical relaxation rounded by QAOA.'
---

The Quantum Hackathon LATAM 2025 ran from 1 to 3 October at the Universidad de Montevideo, in Uruguay. The organisers describe it as the first international quantum computing hackathon organised in Latin America, and they gave it a subject rather than an open brief: Quantum for Climate.

It was promoted by the Universidad de Montevideo together with the Open Quantum Institute (OQI) and sponsored by Microsoft, with collaboration from ANTEL, IEEE Quantum and qBraid, and support from RIPAISC, CLEI, ANII, which granted it a Declaration of National Interest, UNESCO, the International Year of Quantum Science and Technology, IEEE Region 9, and Uruguay Natural, which granted it a Declaration of Tourist Interest. The three days alternated collaborative work sessions with interim presentations, a panel of international experts and cultural activities. Every team answered one of three United Nations Sustainable Development Goals: 6, Clean Water and Sanitation; 11, Sustainable Cities and Communities; and 13, Climate Action. I was on Team 5, Q-Forest, and we answered SDG 11.

## Reforestation as a knapsack problem

What we built was a system to optimise reforestation in the Amazon from geospatial data. The question underneath it is narrow and practical. Given a set of candidate parcels of land, each with an estimated cost to plant and an estimated amount of CO₂ it would eventually capture, which ones do you plant when you cannot afford all of them?

That is the knapsack problem, one of the least forgiving objects in combinatorial optimisation. Every parcel is a yes or a no, so the number of possible plans doubles with each one you add, and ranking parcels by capture per unit of cost is a heuristic that can be beaten. Knapsack is NP-hard: beyond a small instance nobody solves it exactly. You approximate it, and the question becomes how good the approximation is.

## A relaxation, and then the rounding

Our algorithm was hybrid, and the division of labour is the part worth understanding.

The classical half was a semidefinite relaxation. Relaxing a problem means loosening the constraint that makes it hard: instead of forcing every parcel to be a yes or a no, you let it take any value in between, and the combinatorial search becomes a continuous optimisation that convex solvers handle well. The answer that comes back is good and also unusable, because it will tell you to plant 0.63 of a parcel. A relaxation buys information about the shape of the problem, not a plan.

Turning that continuous answer back into a concrete set of parcels is called rounding, and it is where the quality of the final plan is decided. Round carelessly and you either overshoot the budget or throw away most of what the relaxation told you. That was the job we handed to QAOA, the Quantum Approximate Optimisation Algorithm. QAOA prepares a quantum state whose measurement outcomes are candidate plans, alternating an operation that carries the objective with one that mixes between plans, and a classical optimiser tunes the angles between them so that measuring returns good plans with high probability. It is an approximation by construction.

The model ran on the Qiskit Aer simulator with no noise, and it was designed for IBM Quantum hardware. That distinction matters. A noiseless simulation is a statement about the algorithm, not about what a machine available today would return: it says the formulation is sound and that the pipeline from geospatial data to a planting plan holds together end to end. Real hardware adds decoherence and gate error, which is precisely the term this result does not contain.

## What the numbers say

Registration closed at 380 undergraduate and graduate students, from 21 countries and 86 universities. Of those, 157 completed the QWorld preparatory course. What arrived in Montevideo was 80 participants from 40 universities and 10 countries, working in 8 teams and in three languages: Spanish, English and Portuguese. Uruguay accounted for 22.5 per cent of them, Brazil and Peru for 13.8 each, Colombia 11.3, Argentina and Chile 10 each, Costa Rica 6.3, Mexico 5, Ecuador and Paraguay 3.8.

A room with those proportions in it did not exist in this form before, and that is the substance behind the word first. Nearly four hundred students in the region wanted in, and 157 of them worked through a quantum course on their own time to prepare for a weekend.

## The results

Miqro took first place, Q-Enso second and GQG, Green Quantum Grids, third. QBrigade took the Sustainability Award. Q-Forest did not place, and I would rather write that down than write around it.

Q-Forest was Ariana Camila López Julcarima, Cesar Augusto do Amaral, Daglio Matías Agustín, Daniel Eduardo Zuluaga Escobar, Diogo Fernando Santos Lacerda da Silva, Estefany Beatriz Bica Curbelo, Jose Alessandro Quispe Cabello, Mateo Vidal, Tomás Crosta and me. Ten people from several countries who had not met before Wednesday, agreeing by Friday on a formulation, a solver and what the model was allowed to claim.
