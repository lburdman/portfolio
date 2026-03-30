---
title: 'Hybrid Classical–Quantum Neural Networks for Audio Emotion Classification'
projectSlug: 'quantum-audio'
summary: 'An end-to-end speech emotion recognition pipeline on CREMA-D using mel-spectrograms, transfer learning, and hybrid quantum/classical heads — focused on controlled experimentation under realistic resource constraints.'
lang: 'en'
tags: ['Quantum ML', 'PyTorch', 'PennyLane', 'Speech Processing', 'Deep Learning', 'CREMA-D']
featured: true
status: 'published'
github: 'https://github.com/lburdman/qnn-speech-recognition'
order: 3
---

## Overview

An end-to-end research pipeline for speech emotion recognition using the CREMA-D dataset. The central contribution is a systematic comparison between classical and hybrid quantum/classical neural network architectures under controlled, resource-realistic conditions.

## Problem

Quantum machine learning is a field with significant theoretical promise but limited empirical validation under realistic constraints. This project asks: can hybrid quantum/classical models compete with — or improve upon — classical baselines on an audio classification task when resources are constrained?

## Pipeline

1. **Data preparation**: CREMA-D audio clips preprocessed into fixed-length mel-spectrogram representations.
2. **Feature extraction**: Pre-trained CNN backbone (transfer learning) to extract compact audio embeddings.
3. **Dimensionality reduction**: PCA applied to map embeddings to the small qubit-compatible space required by quantum circuits.
4. **Classical head baseline**: Fully connected classifier trained on the reduced embeddings.
5. **Quantum head**: Parameterized quantum circuit (PQC) implemented in PennyLane, acting as a classifier head.
6. **Hybrid model**: CNN backbone → dimensionality reduction → PQC head, trained end-to-end.
7. **Hardware verification**: Selected experiments run on IBM Quantum hardware to validate real-device behavior vs. simulation.

## Key Design Decisions

- **Controlled comparison**: Classical and quantum heads receive the same inputs, ensuring fair evaluation.
- **Realistic resource constraints**: Qubit count and circuit depth are constrained to what is executable on current hardware.
- **Transfer learning for embeddings**: Using a frozen pre-trained backbone removes the need for quantum circuits to handle raw audio — a practical necessity given current qubit counts.
- **PennyLane + PyTorch integration**: Allows gradient flow through hybrid classical/quantum circuits using standard PyTorch training loops.

## Key Learnings

The limiting factor is not algorithmic — it is hardware noise and limited qubit counts. Dimensionality reduction is a practical necessity, not an optimization. The results provide an honest empirical benchmark for hybrid models at current hardware capability levels.
