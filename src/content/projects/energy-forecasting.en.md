---
title: 'Energy Demand Forecasting'
projectSlug: 'energy-forecasting'
summary: 'A 24-hour ahead electricity demand forecasting pipeline with feature engineering, rolling-origin validation, tree-based models, and uncertainty estimation — focused on reproducible ML evaluation.'
lang: 'en'
tags: ['Machine Learning', 'Time Series', 'Python', 'Scikit-learn', 'Forecasting', 'XGBoost']
featured: true
status: 'published'
github: 'https://github.com/lburdman/energy-demand-forecasting'
order: 2
---

## Overview

A full machine learning pipeline for forecasting electricity demand 24 hours ahead. Built with an emphasis on reproducible experimentation, practical evaluation methodology, and honest uncertainty estimation.

## Problem

Short-term electricity demand forecasting is a high-stakes problem: poor predictions lead to waste, grid instability, or shortfalls. This project treats it as a rigorous applied ML problem — not just a modeling exercise.

## Pipeline

1. **Data ingestion and cleaning**: Handling missing values, timezone normalization, and anomaly flagging.
2. **Feature engineering**: Calendar features, lagged demand, rolling statistics, and weather-derived signals.
3. **Baseline comparison**: Naive persistence, seasonal naive, and linear regression as evaluation anchors.
4. **Model training**: Gradient-boosted trees (XGBoost, LightGBM) with hyperparameter tuning.
5. **Rolling-origin validation**: Time-respecting cross-validation to avoid lookahead leakage.
6. **Uncertainty estimation**: Quantile regression for prediction intervals.
7. **Evaluation dashboard**: Streamlit interface for visual inspection of forecasts and residuals.

## Key Contributions

- Rigorous rolling-origin validation — not a simple train/test split
- Explicit comparison against multiple baselines before claiming model value
- Quantile regression for honest uncertainty communication
- Fully reproducible pipeline with seeded randomness and documented hyperparameters

## Key Learnings

The most important design decision was the validation strategy. Rolling-origin evaluation surfaces failure modes that simple splits miss — especially when calendar patterns and regime changes interact. Proper baseline comparison is also underrated: a well-tuned seasonal naive is hard to beat consistently.
