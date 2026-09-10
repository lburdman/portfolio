---
title: 'Finishing the MITx MicroMasters in Statistics and Data Science'
summary: 'I finished the four courses of the MITx MicroMasters in Statistics and Data Science on edX: Probability, Fundamentals of Statistics, Machine Learning with Python: From Linear Models to Deep Learning, and 6.419x Data Analysis: Statistical Modeling and Computation in Applications. This is what the coursework actually contained, and which part of it the energy demand forecasting project on this site is standing on.'
---

I finished the four courses of the Statistics and Data Science MicroMasters that MITx runs on edX, having started them in 2024. They are Probability; Fundamentals of Statistics; Machine Learning with Python: From Linear Models to Deep Learning, which names its own arc in its title; and Data Analysis: Statistical Modeling and Computation in Applications, catalogued as 6.419x. The credential is the least interesting part of that. What the courses contained is worth writing down.

## Inference before models

Fundamentals of Statistics is the one that changed how I read a result, mine or anyone else's. I came out of it with 98%. It covers statistical inference and the methods of estimation underneath it, parametric and nonparametric hypothesis testing, linear models and regression, maximum likelihood estimation, and confidence intervals and p-values — the last two being the quantities most often quoted and least often understood. The value of the course is that it makes those things derivable rather than quotable. Once you have built a confidence interval out of its assumptions, you can no longer report one without knowing which assumptions you have just borrowed.

## Four domains, one problem each

6.419x is the applied course, and it is built as four separate encounters with real data rather than one continuous syllabus. I came out of it with 97%.

The first is genomics, where the difficulty is that the data has more dimensions than anyone can look at: PCA, MDS and t-SNE to reduce and visualise it, and the harder work of deciding what a picture of high-dimensional data is actually allowed to tell you. The second is criminal networks, treated as graphs, where centrality measures are the tools for asking which nodes matter and why. The third is prices, economics and time series — forecasting with stationary models, moving average and autoregressive, and then checking those models against financial-style data instead of trusting them. The fourth is environmental data and spatial statistics, where Gaussian processes model a quantity across space and every prediction arrives with its uncertainty quantified rather than stated flat.

## Where the fourth course ended up

The energy demand forecasting project elsewhere on this site rests on the last two of those. The time-series module is where the vocabulary comes from: stationarity, autoregressive and moving-average structure, and the discipline of checking a forecast by interrogating what is left in its residuals rather than by reading a single headline error. The spatial module is where the second habit comes from — that a prediction without an interval around it is an incomplete answer. The project's baselines, its residual diagnostics and its prediction intervals are all that coursework arriving somewhere it had to hold up.

That is the takeaway I would keep from all four courses. Strong data analysis is not running models. It is asking the right question, choosing a method deliberately and being able to say why that one, and turning what comes back into a conclusion someone can act on.
