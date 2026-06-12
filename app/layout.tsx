import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agent Memory API — Context Summariser for AI Pipelines',
  description: 'Compress conversation history into structured memory. Extract decisions, open questions, entities, next actions, and key facts from any AI agent conversation.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', color: '#e5e5e5' }}>
        {children}
      </body>
    </html>
  )
}
