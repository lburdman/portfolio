---
title: 'Hybrid Classical–Quantum Neural Networks for Audio Emotion Classification'
summary: 'A speech emotion recognition pipeline on CREMA-D using mel-spectrograms, frozen pre-trained backbones and a variational quantum head — with selected inference replayed on real IBM Quantum hardware.'
---

## Overview

An end-to-end research pipeline for speech emotion recognition on the CREMA-D dataset. The central contribution is a controlled comparison between a classical head and a variational quantum head, both trained on top of the same frozen classical backbone.

## Problem

Quantum machine learning is a field with significant theoretical promise but limited empirical validation under realistic constraints. This project asks: can a variational quantum circuit head compete with — or improve upon — a classical head on an audio classification task, when both receive identical features and the circuit is small enough to run on today's hardware?

## Pipeline

1. **Data preparation**: CREMA-D audio clips preprocessed into fixed-length mel-spectrograms, MFCCs and precomputed embeddings.
2. **Feature extraction**: A pre-trained backbone — ResNet18, VGG16 or PANNs CNN14 — produces compact audio representations.
3. **Projection to qubit scale**: A small trainable head (Linear → ReLU → Linear → ReLU) maps the backbone representation down to `n_qubits` values, the input width a circuit of this size can accept.
4. **Classical head baseline**: An MLP classifier trained on the projected features.
5. **Quantum head**: A variational circuit built from `AngleEmbedding` and `BasicEntanglerLayers`, wrapped as a PennyLane `TorchLayer` and used as the classifier head.
6. **Two-stage training**: The backbone and projector are pretrained with a linear classifier, then frozen; only the selected head — classical or quantum — is fine-tuned in the second stage.
7. **Hardware verification**: Exported circuit weights and inputs are replayed on a real IBM QPU through Qiskit Runtime. The committed notebook shows the circuit transpiled for `ibm_kingston`, alongside the same circuit on a local simulator.

## Key Design Decisions

- **Controlled comparison**: Both heads sit on the same frozen backbone and the same projector width, so the head type is the only variable.
- **Realistic resource constraints**: Qubit count and circuit depth are held to what current hardware can execute, and the projector exists precisely to meet that limit.
- **Transfer learning for representations**: A frozen pre-trained backbone removes any need for the circuit to handle raw audio — a practical necessity at present qubit counts, not a shortcut.
- **PennyLane + PyTorch integration**: `TorchLayer` lets gradients flow through the hybrid model inside an ordinary PyTorch training loop.
- **Exported quantum artifacts**: Weights, inputs and circuit metadata are exported and unit-tested for reconstruction, which is what makes the hardware replay possible at all.

## Key Learnings

The limiting factor is not algorithmic — it is hardware noise and limited qubit counts. Dimensionality reduction is a practical necessity, not an optimization: the circuit dictates the input width, and everything upstream has to meet it. Running the same circuit in simulation and on a real device is where the gap between the two stops being theoretical.
