// Shared content store for the site + admin page. Persists to localStorage.
window.LP_DATA = (function () {
  var KEY = 'lp_site_data_v1';
  var defaults = {
    articles: [
      { id: 'sanctions', icon: 'book-open', category: 'Research Paper', title: 'Impact of US and EU Sanctions on the Russian Economy', date: '2022 · Bocconi University', tags: ['Econometrics', 'Policy'], mediaBg: 'var(--ink-900)', status: 'Thesis', accent: false, html: '',
        abstract: 'Applied econometric techniques to analyze the macroeconomic consequences of US and EU sanctions on Russia. Research paper for my BSc thesis at Bocconi University.',
        metrics: [{ label: 'Sanction waves', value: '6' }, { label: 'Macro series', value: '14' }, { label: 'Sample period', value: '2014–21' }],
        body: ['[Placeholder] This section summarizes the identification strategy: sanction announcements are treated as discrete policy events, and their effects on output, exchange rates, and trade flows are estimated against a synthetic counterfactual.', '[Placeholder] The full text, tables, and robustness checks will be attached here. Replace this paragraph with the thesis abstract and key findings.'],
        method: 'Estimates are placeholders pending the full text. All series were sourced from public macroeconomic databases and deflated to constant prices.' },
      { id: 'walkforward', icon: 'line-chart', category: 'Working Paper', title: 'Walk-Forward Validation for Deep Learning Alpha Models', date: '12 Jun 2026 · Preprint', tags: ['Time-Series', 'Backtesting'], mediaBg: 'var(--blue-600)', status: 'Preprint', accent: true, showFigure: true, html: '',
        abstract: 'Standard cross-validation leaks future information into training folds when observations are temporally dependent. This note describes the walk-forward protocol I use to evaluate LSTM and Transformer alpha models, and quantifies the optimism gap of naive validation.',
        metrics: [{ label: 'Folds', value: '12' }, { label: 'Seeds per fold', value: '5' }, { label: 'Optimism gap', value: '+0.38 SR' }],
        body: ['[Placeholder] Financial time series violate the exchangeability assumption behind standard k-fold cross-validation: shuffling observations lets the model train on information that would not have been available at prediction time. The result is a validation score that systematically overstates live performance.', '[Placeholder] The walk-forward protocol below preserves temporal order. The sample is partitioned into contiguous folds; the model trains only on data preceding each validation window, and the window rolls forward until the series is exhausted. Figure 01 steps through one full cycle.', '[Placeholder] Replace these paragraphs with the full text of the article — results tables, drift diagnostics, and the comparison against purged k-fold.'],
        method: 'All reported figures are means across five random seeds on held-out test partitions. Metrics shown above are placeholders.' },
      { id: 'glosten', icon: 'search', category: 'Explainer', title: 'Simulating the Glosten-Milgrom Model in the Browser', date: '2025 · quant.lpulcini.com', tags: ['Microstructure', 'Rust'], mediaBg: 'var(--gray-150)', status: 'Article', accent: true, html: '',
        abstract: 'A walkthrough of the Glosten-Milgrom sequential trade model and its implementation as a real-time browser simulation in Rust and WebAssembly.',
        metrics: [{ label: 'Trades simulated', value: '10,000' }, { label: 'Informed share', value: '30%' }, { label: 'Frame budget', value: '16 ms' }],
        body: ['[Placeholder] The Glosten-Milgrom model explains the bid-ask spread as compensation for adverse selection: a market maker quotes two prices because some counterparties know more than she does.', '[Placeholder] Replace this paragraph with the derivation of the posterior updating rule and notes on the WebAssembly implementation.'],
        method: 'Simulation parameters mirror the live demo at quant.lpulcini.com. Figures are placeholders.' },
      { id: 'blacklitterman', icon: 'pen-line', category: 'Technical Note', title: 'Black-Litterman in Practice: From Views to Weights', date: '2025 · Working note', tags: ['Portfolio Theory', 'Python'], mediaBg: 'var(--blue-500)', status: 'Draft', accent: false, html: '',
        abstract: 'A practical note on translating discretionary views into posterior expected returns and portfolio weights, with the numerical pitfalls I hit building the optimization suite.',
        metrics: [{ label: 'Assets', value: '25' }, { label: 'Views', value: '4' }, { label: 'Tau', value: '0.05' }],
        body: ['[Placeholder] The Black-Litterman model blends market-implied equilibrium returns with subjective views, producing posterior estimates that avoid the extreme corner solutions of raw mean-variance optimization.', '[Placeholder] Replace this paragraph with the worked example: view matrices, confidence calibration, and the resulting weight vectors.'],
        method: 'Numerical example computed with the Portfolio Optimization Suite. Values are placeholders.' },
      { id: 'kafka', icon: 'activity', category: 'Engineering Note', title: 'Statistical Anomaly Detection on 500K Daily Messages', date: '2024 · Engineering note', tags: ['Kafka', 'Monitoring'], mediaBg: 'var(--green-700)', status: 'Article', accent: false, html: '',
        abstract: 'Notes from building Kafka-based monitoring pipelines at Accenture: how statistical anomaly detection catches transaction-flow incidents before threshold alerts do.',
        metrics: [{ label: 'Daily messages', value: '500K+' }, { label: 'Detection lead', value: '~11 min' }, { label: 'False positives', value: '−62%' }],
        body: ['[Placeholder] Fixed thresholds fail on seasonal traffic: what is anomalous at 3 a.m. is normal at noon. Modeling each metric as a time-dependent distribution lets the pipeline flag deviations relative to expected behavior.', '[Placeholder] Replace this paragraph with the architecture diagram and the evaluation against the incident log.'],
        method: 'Figures describe the production system at a major financial institution and are placeholders pending publication clearance.' }
    ],
    experiences: [
      { company: 'Washington University in St. Louis', role: 'Teaching Assistant', period: 'Jan 2026 — Present', location: 'St Louis, MO', isCurrent: true, highlights: ['Teaching Assistant for Investment Theory and Methods in Fintech.'] },
      { company: 'Washington University in St. Louis', role: 'Data Analyst — Campus Operations', period: 'Oct 2025 — Present', location: 'St Louis, MO', isCurrent: true, highlights: ['I develop reproducible Python/SQL ETL pipelines to clean and transform complex utilization datasets.', 'I quantify space usage patterns to inform resource allocation and strategic planning.'] },
      { company: 'Accenture', role: 'Senior Software Engineer', period: 'Apr 2023 — Jul 2025', location: 'Milan, Italy', isCurrent: false, highlights: ['Architected systems processing high-frequency transaction data (over 1M/day) for a major financial institution.', 'Led the migration of a core transaction proxy from Java to Go, achieving a 10% throughput increase.', 'Engineered a RAG system enabling natural language queries on internal documentation.', 'Designed Kafka-based monitoring pipelines handling 500K+ daily messages with statistical anomaly detection.', 'Owned performance stress testing and incident response for critical financial infrastructure.'] },
      { company: 'Raccoon Fantasy', role: 'Co-Founder & CTO', period: 'Jan 2020 — Jan 2024', location: 'Milan, Italy', isCurrent: false, highlights: ['Designed a dynamic in-game market economy with liquidity monitoring and pricing algorithms.', 'Managed the engineering roadmap, translating economic requirements into technical specifications.', 'Built scalable multiplayer infrastructure supporting 150+ concurrent players.'] },
      { company: 'Similar', role: 'Co-Founder & COO', period: 'Jan 2020 — Jan 2024', location: 'Milan, Italy', isCurrent: false, highlights: ['Built a personalized recommendation engine, handling the complete ML pipeline from design to optimization.', 'Secured 3rd place at a startup incubator competition, attracting initial investor funding.'] }
    ],
    education: [
      { degree: 'MS, Quantitative Finance', school: 'Washington University in St. Louis', period: '2025 — Present', location: 'St Louis, MO', note: 'GPA 4.0. Teaching Assistant for Investment Theory and Methods in Fintech.', isCurrent: true },
      { degree: 'BSc, Economics', school: 'Bocconi University', period: 'BSc', location: 'Milan, Italy', note: 'Thesis: Impact of US and EU Sanctions on the Russian Economy.', isCurrent: false }
    ]
  };
  function load() {
    try {
      var s = localStorage.getItem(KEY);
      if (s) {
        var d = JSON.parse(s);
        return {
          articles: Array.isArray(d.articles) ? d.articles : defaults.articles,
          experiences: Array.isArray(d.experiences) ? d.experiences : defaults.experiences,
          education: Array.isArray(d.education) ? d.education : defaults.education
        };
      }
    } catch (e) { /* fall through to defaults */ }
    return JSON.parse(JSON.stringify(defaults));
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
  function reset() { localStorage.removeItem(KEY); }
  return { load: load, save: save, reset: reset, defaults: defaults };
})();
