const CARDS = [
  { label: 'Endpoint', value: 'POST /api/summarise', desc: 'Full conversation → structured memory' },
  { label: 'Endpoint', value: 'POST /api/extract', desc: 'Any text → selectable fact fields' },
  { label: 'Model', value: 'Claude Haiku 4.5', desc: 'Fast, cost-efficient, schema-constrained JSON' },
  { label: 'Output', value: 'JSON only', desc: 'Decisions, entities, next actions, facts' },
] as const

const USE_CASES = [
  'Long-running agent sessions — compress context before hitting token limits',
  'Multi-agent handoffs — pass structured memory between specialized agents',
  'Meeting & transcript processing — extract action items and decisions automatically',
  'Document ingestion pipelines — pull structured facts from any text input',
  'Agent state persistence — save and restore agent context across sessions',
  'Audit trails — maintain a structured log of decisions in automated workflows',
] as const

export default function Home() {
  return (
    <main className="page">
      <div>
        <p className="kicker">Agent Memory API</p>
        <h1 className="hero">
          Context Summariser
          <br />
          for AI Pipelines
        </h1>
        <p className="lede">
          Compress long conversations into structured memory. Extract decisions, open questions, entities,
          next actions, and key facts — so your agents never lose context.
        </p>
      </div>

      <div className="cards">
        {CARDS.map((card) => (
          <div key={card.value} className="card">
            <div className="card-label">{card.label}</div>
            <div className="card-value">{card.value}</div>
            <div className="card-desc">{card.desc}</div>
          </div>
        ))}
      </div>

      <section className="section">
        <h2>Endpoints</h2>

        <div style={{ marginBottom: 32 }}>
          <div className="method-row">
            <span className="method">POST</span>
            <code className="endpoint-path">/api/summarise</code>
          </div>
          <p className="endpoint-copy">
            Takes a full conversation history as a messages array. Returns structured memory with summary,
            decisions, open questions, entities, next actions, key facts, and compression stats.
          </p>
          <pre className="block">{`{
  "messages": [
    { "role": "user", "content": "We need to build a Stripe integration." },
    { "role": "assistant", "content": "One-time or subscriptions?" },
    { "role": "user", "content": "Subscriptions, £9.99/month. Using Stripe Checkout." }
  ],
  "focus": "Stripe integration",
  "max_summary_tokens": 300
}`}</pre>
        </div>

        <div>
          <div className="method-row">
            <span className="method">POST</span>
            <code className="endpoint-path">/api/extract</code>
          </div>
          <p className="endpoint-copy">
            Extract structured facts from any text block — meeting notes, documents, transcripts, agent outputs.
            Choose exactly which fields to return.
          </p>
          <pre className="block">{`{
  "text": "Budget capped at £50k. Decided on AWS over GCP. John sends contract Friday.",
  "extract": ["decisions", "key_facts", "next_actions"]
}`}</pre>
        </div>
      </section>

      <section className="section">
        <h2>Response shape</h2>
        <pre className="block">{`{
  "success": true,
  "summary": "The team is building a Stripe subscription integration at £9.99/month...",
  "decisions": ["Use Stripe Checkout (not Elements SDK)", "£9.99/month price point"],
  "open_questions": ["Which webhook events to handle?"],
  "entities": {
    "tools": ["Stripe", "Stripe Checkout"],
    "projects": ["payments integration"],
    "people": [],
    "other": []
  },
  "next_actions": ["Set up Stripe Checkout session endpoint"],
  "key_facts": ["£9.99/month subscription price"],
  "meta": {
    "message_count": 3,
    "input_tokens": 320,
    "output_tokens": 90,
    "approx_input_tokens": 320,
    "approx_output_tokens": 90,
    "compression_ratio": 72,
    "model": "claude-haiku-4-5-20251001"
  },
  "request_id": "00000000-0000-4000-8000-000000000000"
}`}</pre>
      </section>

      <section>
        <h2 style={{ marginBottom: 16 }}>Use cases</h2>
        <div className="use-grid">
          {USE_CASES.map((item) => (
            <div key={item} className="use-card">
              {item}
            </div>
          ))}
        </div>
      </section>

      <footer className="page-footer">
        Agent Memory API · Available on RapidAPI · Built for AI pipelines
      </footer>
    </main>
  )
}
