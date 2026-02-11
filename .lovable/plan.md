

## Save Financial Advisor + Penfield Analysis to Plan Folder

### What
Update `.lovable/plan.md` to include the analysis of how Penfield can enhance the financial advisor bot, along with the production-ready chat memory architecture.

### Content to Save
The new section will cover:
- Three Penfield integration patterns (session continuity, knowledge graph, context management)
- Production architecture using a `chat_memories` table with vector embeddings for semantic recall
- Schema design for persisting advisor conversations and user financial profiles
- How the advisor can recall past topics, risk tolerance, and goals across sessions

### File Modified
- `.lovable/plan.md` -- append new section below the existing Chainlink caching plan

---

## Financial Advisor + Penfield Integration Analysis

### Penfield Integration Patterns (Development-Time)

**1. Session Continuity** — `store` / `recall`
- After each advisor conversation, store a summary: key topics discussed, user preferences revealed (risk tolerance, investment style), action items.
- On next session, `recall("user financial profile")` to prime the system prompt with prior context.
- Example: *"User previously discussed paying off credit card debt before investing. Risk tolerance: moderate. Interested in index funds."*

**2. Knowledge Graph** — `connect`
- Link related financial events across sessions:
  - `"Paid off credit card"` → `enables` → `"Start emergency fund"`
  - `"Emergency fund complete"` → `prerequisite_for` → `"Begin investing"`
- Enables the agent to understand the user's financial journey holistically.

**3. Context Management** — `save_context` / `restore_context`
- Save cognitive state when switching between complex financial planning topics.
- Restore full context when revisiting a multi-session plan (e.g., debt payoff strategy spanning weeks).

### Production Architecture (Runtime Memory)

For the actual deployed app, implement a similar pattern using a Supabase table:

```sql
CREATE TABLE chat_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  memory_type text DEFAULT 'conversation', -- conversation | preference | goal | insight
  embedding vector(1536),                  -- For semantic search / recall
  metadata jsonb DEFAULT '{}',             -- risk_tolerance, topics, action_items
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories"
  ON chat_memories FOR ALL
  USING (auth.uid() = user_id);
```

### How It Works at Runtime

1. **After each conversation**: The edge function extracts key facts (risk tolerance, goals mentioned, advice given) and stores them as memories with embeddings.
2. **Before each conversation**: Query `chat_memories` with semantic search to find relevant past context, inject into the system prompt.
3. **User profile builds over time**: Metadata accumulates preferences — the advisor gets smarter with each session.

### Key User-Facing Benefits
- Advisor remembers past topics without user repeating themselves
- Personalized advice based on accumulated financial profile
- Continuity across sessions: *"Last time we discussed your student loans — have you started the avalanche strategy?"*

