---
title: 'Energy Demand Forecasting'
summary: 'A 24-hour ahead electricity demand forecasting pipeline with leakage-safe feature engineering, rolling-origin validation, tree-based models and conformal prediction intervals — focused on reproducible ML evaluation.'
---

## Overview

A full machine learning pipeline for forecasting German electricity demand 24 hours ahead, built on the Open Power System Data hourly load series. The emphasis is reproducible experimentation, practical evaluation methodology and honest uncertainty estimation.

## Problem

Short-term electricity demand forecasting is a high-stakes problem: poor predictions lead to waste, grid instability, or shortfalls. This project treats it as a rigorous applied ML problem — not just a modeling exercise.

## Pipeline

1. **Data ingestion and cleaning**: Hourly German load from OPSD, parsed onto a sorted UTC index, with gaps closed by time-aware interpolation.
2. **Feature engineering**: Calendar features (hour, day of week, month, weekend flag), lags at t−1, t−24 and t−168, and rolling mean and standard deviation over 24h and 168h windows — every window shifted one step back so no present value can leak into its own feature.
3. **Baseline comparison**: A naive lag-24 forecast and a scaled Ridge regression as evaluation anchors.
4. **Model training**: Random Forest and XGBoost, with hyperparameters fixed and recorded in source rather than tuned in a notebook.
5. **Rolling-origin validation**: Five walk-forward folds of 720 hours each — time-respecting cross-validation that cannot look ahead.
6. **Uncertainty estimation**: Split conformal prediction — the calibration set's absolute-residual quantile becomes a 95% interval around each forecast.
7. **Evaluation dashboard**: Streamlit interface for visual inspection of forecasts and residuals.

## Results

On a chronological 80/20 hold-out split, XGBoost reaches **RMSE 2238.99, MAE 1482.16, MAPE 0.0291**, against a naive lag-24 baseline at **RMSE 8993.08** and a Ridge baseline at **RMSE 5016.67** — roughly a fourfold reduction in RMSE over the naive anchor. Random Forest lands in the same band (RMSE 2258.22), so the gain comes from moving to trees at all, not from XGBoost in particular.

## Key Contributions

- Rolling-origin validation across five folds, rather than a single train/test split
- Explicit comparison against a naive and a linear baseline before claiming any model value
- Conformal prediction intervals — distribution-free coverage, which matters here because the residuals are visibly heavy-tailed
- Residual diagnostics — Ljung-Box, ACF, ADF and QQ — instead of a single headline metric
- Seeded randomness and hyperparameters kept in source, so a run is reproducible

## Key Learnings

The most important design decision was the validation strategy. Rolling-origin evaluation surfaces failure modes a single split misses: fold-level RMSE for the tree models ranges from roughly 1300 to 3400, so one arbitrary split would have flattered or penalised the result depending on where it landed. The residual diagnostics were the other half of the value — autocorrelation left in the errors points at drivers the feature set does not carry. Holiday calendars and temperature are the obvious candidates, and both are still open work.
