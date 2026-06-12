export default function Home() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ marginBottom: 48 }}>
        <span style={{ fontSize: 13, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Agent Memory API
        </span>
        <h1 style={{ fontSize: 42, fontWeight: 700, margin: '12px 0 16px', lineHeight: 1.15, color: '#fff' }}>
          Context Summariser<br />for AI Pipelines
        </h1>
        <p style={{ fontSize: 18, color: '#aaa', maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
          Compress long conversations into structured memory. Extract decisions, open questions, entities, 
          next actions, and key facts — so your agents never lose context.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 48 }}>
        {[
          { label: 'Endpoint', value: 'POST /api/summarise', desc: 'Full conversation → structured memory' },
          { label: 'Endpoint', value: 'POST /api/extract', desc: 'Any text → selectable fact fields' },
          { label: 'Model', value: 'Claude Haiku', desc: 'Fast, cost-efficient, high accuracy' },
          { label: 'Output', value: 'JSON only', desc: 'Decisions, entities, next actions, facts' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#888' }}>{card.desc}</div>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 24 }}>Endpoints</h2>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>POST</span>
            <code style={{ fontSize: 15, color: '#e5e5e5' }}>/api/summarise</code>
          </div>
          <p style={{ color: '#aaa', fontSize: 15, marginBottom: 12 }}>
            Takes a full conversation history as a messages array. Returns structured memory with summary, 
            decisions, open questions, entities, next actions, key facts, and compression stats.
          </p>
          <pre style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: 16, fontSize: 13, color: '#ccc', overflowX: 'auto' }}>
{`{
  "messages": [
    { "role": "user", "content": "We need to build a Stripe integration." },
    { "role": "assistant", "content": "One-time or subscriptions?" },
    { "role": "user", "content": "Subscriptions, £9.99/month. Using Stripe Checkout." }
  ],
  "focus": "Stripe integration",
  "max_summary_tokens": 300
}`}
          </pre>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>POST</span>
            <code style={{ fontSize: 15, color: '#e5e5e5' }}>/api/extract</code>
          </div>
          <p style={{ color: '#aaa', fontSize: 15, marginBottom: 12 }}>
            Extract structured facts from any text block — meeting notes, documents, transcripts, agent outputs. 
            Choose exactly which fields to return.
          </p>
          <pre style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: 16, fontSize: 13, color: '#ccc', overflowX: 'auto' }}>
{`{
  "text": "Budget capped at £50k. Decided on AWS over GCP. John sends contract Friday.",
  "extract": ["decisions", "key_facts", "next_actions"]
}`}
          </pre>
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Response shape</h2>
        <pre style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: 16, fontSize: 13, color: '#ccc', overflowX: 'auto' }}>
{`{
  "success": true,
  "summary": "The team is building a Stripe subscription integration at £9.99/month...",
  "decisions": ["Use Stripe Checkout (not Elements SDK)", "£9.99/month price point"],
  "open_questions": ["Which webhook events to handle?"],
  "entities": {
    "tools": ["Stripe", "Stripe Checkout"],
    "projects": ["payments integration"],
    "people": [], "other": []
  },
  "next_actions": ["Set up Stripe Checkout session endpoint"],
  "key_facts": ["£9.99/month subscription price"],
  "meta": {
    "message_count": 3,
    "approx_input_tokens": 48,
    "approx_output_tokens": 85,
    "compression_ratio": -77
  }
}`}
        </pre>
      </section>

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Use cases</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            'Long-running agent sessions — compress context before hitting token limits',
            'Multi-agent handoffs — pass structured memory between specialized agents',
            'Meeting & transcript processing — extract action items and decisions automatically',
            'Document ingestion pipelines — pull structured facts from any text input',
            'Agent state persistence — save and restore agent context across sessions',
            'Audit trails — maintain a structured log of decisions in automated workflows',
          ].map((item, i) => (
            <div key={i} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '14px 16px', fontSize: 14, color: '#aaa', lineHeight: 1.5 }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #222', fontSize: 13, color: '#555' }}>
        Agent Memory API · Available on RapidAPI · Built for AI pipelines
      </footer>
    </main>
  )
}
