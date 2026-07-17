export const defaultData = {
  profile: {
    name: "Lorenzo Pulcini",
    eyebrow: "Research · Engineering · Quantitative Finance",
    headline: "Research and applied work in quantitative finance.",
    intro: "I build quantitative models and the software systems that make them useful—from market microstructure simulations to production financial infrastructure.",
    about: "I work at the intersection of financial theory and software engineering. I am completing an MS in Quantitative Finance at Washington University in St. Louis; before that I was a Senior Software Engineer at Accenture, building high-frequency transaction infrastructure for a major financial institution.",
    availability: "Seeking Fall 2026 internships",
    email: "pulcini@wustl.edu",
    phone: "+1 (314) 565-4894",
    location: "St Louis, Missouri, United States",
    linkedin: "https://linkedin.com/in/lorenzo-pulcini",
    github: "https://github.com/Alfagov"
  },
  media: [],
  attachments: [],
  articles: [
    {
      id: "sanctions",
      category: "Research Paper",
      title: "Impact of US and EU Sanctions on the Russian Economy",
      date: "2022 · Bocconi University",
      tags: ["Econometrics", "Policy"],
      status: "Thesis",
      abstract: "Applied econometric techniques to analyze the macroeconomic consequences of US and EU sanctions on Russia. Research paper for my BSc thesis at Bocconi University.",
      metrics: [{ label: "Sanction waves", value: "6" }, { label: "Macro series", value: "14" }, { label: "Sample period", value: "2014–21" }],
      body: ["This section summarizes the identification strategy: sanction announcements are treated as discrete policy events, and their effects on output, exchange rates, and trade flows are estimated against a synthetic counterfactual.", "The full text, tables, and robustness checks will be attached here."],
      method: "All series were sourced from public macroeconomic databases and deflated to constant prices."
    },
    {
      id: "walkforward",
      category: "Working Paper",
      title: "Walk-Forward Validation for Deep Learning Alpha Models",
      date: "12 Jun 2026 · Preprint",
      tags: ["Time-Series", "Backtesting"],
      status: "Preprint",
      abstract: "Standard cross-validation leaks future information into training folds when observations are temporally dependent. This note describes a walk-forward protocol for evaluating LSTM and Transformer alpha models.",
      metrics: [{ label: "Folds", value: "12" }, { label: "Seeds per fold", value: "5" }, { label: "Optimism gap", value: "+0.38 SR" }],
      body: ["Financial time series violate the exchangeability assumption behind standard k-fold cross-validation: shuffling observations lets the model train on information that would not have been available at prediction time.", "The walk-forward protocol preserves temporal order. The model trains only on data preceding each validation window, and the window rolls forward until the series is exhausted."],
      method: "Reported figures are means across five random seeds on held-out test partitions."
    },
    {
      id: "glosten",
      category: "Explainer",
      title: "Simulating the Glosten-Milgrom Model in the Browser",
      date: "2025 · quant.lpulcini.com",
      tags: ["Microstructure", "Rust"],
      status: "Article",
      abstract: "A walkthrough of the Glosten-Milgrom sequential trade model and its implementation as a real-time browser simulation in Rust and WebAssembly.",
      metrics: [{ label: "Trades simulated", value: "10,000" }, { label: "Informed share", value: "30%" }, { label: "Frame budget", value: "16 ms" }],
      body: ["The Glosten-Milgrom model explains the bid-ask spread as compensation for adverse selection: a market maker quotes two prices because some counterparties know more than she does."],
      method: "Simulation parameters mirror the live demo at quant.lpulcini.com."
    },
    {
      id: "blacklitterman",
      category: "Technical Note",
      title: "Black-Litterman in Practice: From Views to Weights",
      date: "2025 · Working note",
      tags: ["Portfolio Theory", "Python"],
      status: "Draft",
      abstract: "A practical note on translating discretionary views into posterior expected returns and portfolio weights.",
      metrics: [{ label: "Assets", value: "25" }, { label: "Views", value: "4" }, { label: "Tau", value: "0.05" }],
      body: ["The Black-Litterman model blends market-implied equilibrium returns with subjective views, producing posterior estimates that avoid the extreme corner solutions of raw mean-variance optimization."],
      method: "Numerical example computed with the Portfolio Optimization Suite."
    },
    {
      id: "kafka",
      category: "Engineering Note",
      title: "Statistical Anomaly Detection on 500K Daily Messages",
      date: "2024 · Engineering note",
      tags: ["Kafka", "Monitoring"],
      status: "Article",
      abstract: "Notes from building Kafka-based monitoring pipelines: how statistical anomaly detection catches transaction-flow incidents before threshold alerts do.",
      metrics: [{ label: "Daily messages", value: "500K+" }, { label: "Detection lead", value: "~11 min" }, { label: "False positives", value: "−62%" }],
      body: ["Fixed thresholds fail on seasonal traffic: what is anomalous at 3 a.m. is normal at noon. Modeling each metric as a time-dependent distribution lets the pipeline flag deviations relative to expected behavior."],
      method: "Figures describe a production system at a major financial institution and are generalized for publication."
    }
  ],
  projects: [
    { title: "Quant Sim", description: "Interactive financial models in Rust and WebAssembly.", meta: "2025 — Present", tags: ["Stochastic Processes", "Monte Carlo", "Rust"], url: "https://quant.lpulcini.com" },
    { title: "Market Forecasting", description: "LSTM and Transformer models on limit order book features.", meta: "2025 — Present", tags: ["PyTorch", "Time-Series", "Backtesting"], url: "" },
    { title: "Portfolio Optimization Suite", description: "Mean-variance and Black-Litterman implementations from scratch.", meta: "2025", tags: ["Python", "Optimization"], url: "" }
  ],
  experiences: [
    { id: "washu-ta", company: "Washington University in St. Louis", role: "Teaching Assistant", period: "Jan 2026 — Present", location: "St Louis, MO", isCurrent: true, highlights: ["Teaching Assistant for Investment Theory and Methods in Fintech."] },
    { id: "washu-data", company: "Washington University in St. Louis", role: "Data Analyst — Campus Operations", period: "Oct 2025 — Present", location: "St Louis, MO", isCurrent: true, highlights: ["Develop reproducible Python/SQL ETL pipelines to clean and transform complex utilization datasets.", "Quantify space usage patterns to inform resource allocation and strategic planning."] },
    { id: "accenture", company: "Accenture", role: "Senior Software Engineer", period: "Apr 2023 — Jul 2025", location: "Milan, Italy", isCurrent: false, highlights: ["Architected systems processing more than one million daily transactions for a major financial institution.", "Led the migration of a core transaction proxy from Java to Go, improving throughput by 10%.", "Engineered a RAG system for natural-language queries on internal documentation.", "Designed Kafka monitoring pipelines handling 500K+ daily messages."] },
    { id: "raccoon", company: "Raccoon Fantasy", role: "Co-Founder & CTO", period: "Jan 2020 — Jan 2024", location: "Milan, Italy", isCurrent: false, highlights: ["Designed a dynamic in-game market economy with liquidity monitoring and pricing algorithms.", "Built scalable multiplayer infrastructure supporting 150+ concurrent players."] },
    { id: "similar", company: "Similar", role: "Co-Founder & COO", period: "Jan 2020 — Jan 2024", location: "Milan, Italy", isCurrent: false, highlights: ["Built a personalized recommendation engine and its complete ML pipeline.", "Placed third in a startup incubator competition and attracted initial investor funding."] }
  ],
  education: [
    { id: "washu-ms", degree: "MS, Quantitative Finance", school: "Washington University in St. Louis", period: "2025 — Present", location: "St Louis, MO", note: "GPA 4.0. Teaching Assistant for Investment Theory and Methods in Fintech.", isCurrent: true },
    { id: "bocconi-bsc", degree: "BSc, Economics", school: "Bocconi University", period: "2022", location: "Milan, Italy", note: "Thesis: Impact of US and EU Sanctions on the Russian Economy.", isCurrent: false }
  ],
  ventures: [
    { name: "Raccoon Fantasy", role: "Co-Founder & CTO", period: "2020 — 2024", description: "Blockchain-based multiplayer game with a dynamic market economy and pricing algorithms.", tags: ["Node.js", "Game Dev", "Market Microstructure"] },
    { name: "Similar", role: "Co-Founder & COO", period: "2021 — 2022", description: "Film and TV recommendation system trained on user viewing history.", tags: ["Machine Learning", "ETL", "Testing"] },
    { name: "IBM Watson Insurance AI", role: "Developer", period: "2018", description: "Image-recognition application for insurance damage assessment.", tags: ["IBM Watson", "AI", "Image Recognition"] }
  ],
  skills: [
    { label: "Quantitative Finance", items: ["Derivatives Pricing", "Asset Pricing", "Stochastic Calculus", "Time-Series Analysis", "Portfolio Optimization", "Backtesting", "Risk Modeling"] },
    { label: "Engineering", items: ["Python", "Go", "Rust", "SQL", "Kafka", "Distributed Systems", "ETL Pipelines", "Kubernetes", "CI/CD"] },
    { label: "Credentials", items: ["CFA Level 1 Candidate", "Bloomberg Market Concepts", "Quantum Machine Learning (IBM)"] },
    { label: "Languages", items: ["Italian (Native)", "English (Fluent)", "Spanish (Intermediate)"] }
  ]
};
