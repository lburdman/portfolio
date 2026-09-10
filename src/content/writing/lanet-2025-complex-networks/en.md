---
title: 'LANET 2025, and a first poster'
summary: 'LANET 2025, the Latin American Conference on Complex Networks, met in Punta del Este in August, and it was the first academic conference I attended. I went with a poster on transfer learning for hybrid classical-quantum neural networks, taken from my engineering thesis on emotion classification in audio.'
---

The Latin American Conference on Complex Networks, LANET 2025, met in Punta del Este, Uruguay, in August. It was the first academic conference I attended, and I did not arrive as a spectator: I had a poster in the session, which is a different way to spend a conference than sitting in the back of a room.

The poster was "Transfer Learning para Redes Neuronales Híbridas Clásico-Cuánticas" — transfer learning for hybrid classical-quantum neural networks — written with Leónidas Facundo Caram, who advises my engineering thesis at the Facultad de Ingeniería of the Universidad de Buenos Aires. The work is done at the Laboratorio de Redes y Sistemas Móviles (LRSyM).

## What the poster argued

The thesis behind it is "Redes Neuronales Híbridas Clásico–Cuánticas para Clasificación de Emociones en Audio" — hybrid classical-quantum neural networks for emotion classification in audio — for the electronic engineering degree at FIUBA. The poster compressed it into five panels: objective, introduction, the architecture of the hybrid model, the use case, and conclusions, with a diagram of the variational quantum circuit and the accuracy curves from training alongside them.

The use case was binary emotion classification in speech, over the CREMA-D dataset. The pipeline begins by turning each recording into a mel-spectrogram: a picture of how energy is spread across frequency bands over time, on a scale that follows human hearing rather than raw hertz. Once the audio is an image, it becomes a problem an image model can be pointed at.

That is where transfer learning comes in. Rather than train a network from nothing on a few thousand clips, a ResNet18 already trained on ImageNet does the feature extraction, and only the final stage is trained on this task. What is unusual is what that final stage is. Instead of a classical classification head, the model ends in a variational quantum circuit — a small circuit of parameterised rotations and CNOTs whose angles are trainable. The 512 features leaving the ResNet do not fit on a handful of qubits, so a dressed quantum circuit sits between them: a classical layer that compresses 512 down to the number of qubits the circuit has, then the circuit itself, then a classical layer back out to the classes. The measurements come back out as a classification, and the gradient passes through the whole assembly, so the circuit's angles are learned exactly as the network's weights are. The classical layers do the heavy perceptual work; the quantum layer does the deciding. PyTorch and PennyLane are what make that joint training practical.

The experiment was the point of the whole thing. Hybrid models were compared against fully classical baselines under matched computational constraints, so that what the comparison measured was the architecture and not the resources thrown at it. I am not going to quote a number here, and the poster's claim is narrower than the one this field usually gets offered: the two families were put on the same footing and measured against each other. The project write-up carries the rest of it.

## Standing next to it

A poster session is not a talk. Nobody sits through it. People walk past, stop if the title holds them, and then ask whatever they want in whatever order they want, which means you are examined on the parts you were least prepared to defend rather than the parts you rehearsed.

The response was better than I expected, and the surprise was consistent enough to be worth recording: people did not expect an engineering thesis that explains the fundamentals of quantum computing first and then applies them to machine learning. That combination reads as two separate specialisations to most of the room, and seeing them in one piece of work was the thing that made people stop.

## The rest of the programme

LANET is a complex-networks conference, so most of what I sat through was not quantum at all. The talks spanned multilayer network analysis — systems where the same set of nodes is connected in several different ways at once, and where treating each layer separately loses exactly the interaction you care about — and epidemic dynamics, which is what happens when you run a spreading process on top of that structure. The applications ran to social systems and to neuroscience.

I left with a question rather than a conclusion. The methods I spent those sessions listening to describe structure, and the ones I work on operate on it; where those two meet is not obvious to me yet, and that is the part I would like to find out in whatever comes after the thesis.
