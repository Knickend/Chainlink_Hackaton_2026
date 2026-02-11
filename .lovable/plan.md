

## Restore Penfield Integration Plan + Pro-Only Memory Gating

Append the Penfield integration and chat memory architecture plan to `.lovable/plan.md`, with the addition that conversation memory is a **Pro-only feature**.

### Content to Append

---

**1. Penfield Development-Time Integration**
- Use `store`/`recall` during development to persist architectural decisions and debugging context
- Use `connect` to build knowledge graphs linking financial concepts
- Use `save_context` to checkpoint investigation progress for multi-session work

**2. Production Runtime Architecture -- `chat_memories` Table**
- Create a `chat_memories` table with pgvector embeddings for semantic recall in the Financial Advisor chat
- Store conversation history, user financial profiles (risk tolerance, goals, preferences), and advisor insights
- Enable the advisor to reference past conversations and user context for personalized responses

**3. Proposed Schema**

```text
chat_memories
  - id: uuid (PK, default gen_random_uuid())
  - user_id: uuid (NOT NULL)
  - content: text (NOT NULL)
  - memory_type: text ('conversation', 'preference', 'insight', 'goal')
  - embedding: vector(1536) (for semantic search via pgvector)
  - metadata: jsonb (tags, session IDs, financial context)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())
```

RLS policies: users can only read/write their own memories.

**4. Pro-Only Gating**

Chat memory is a Pro-exclusive feature:
- In `FinancialAdvisorChat`, check `isPro` from `useSubscription()` before storing or recalling memories
- Free/Standard users get the normal stateless advisor (no memory persistence)
- Pro users get personalized, context-aware advice that remembers past conversations and preferences
- The `financial-advisor` edge function receives a `memories` array only when the client includes recalled context (Pro path)
- Non-Pro users simply send messages without the memory context -- the edge function works the same either way
- Add a subtle "Pro" badge or hint in the chat UI when memory is active (e.g., "I remember you mentioned...")

**5. Integration with Financial Advisor Chat**

The `FinancialAdvisorChat` component and its `financial-advisor` edge function would be enhanced to:
- **(Pro only)** Store each conversation turn as a memory after the response completes
- **(Pro only)** On new messages, recall relevant past context via embedding similarity search
- **(Pro only)** Inject recalled context into the system prompt so the advisor "remembers" the user
- **(Pro only)** Store detected user preferences (risk tolerance, financial goals) as dedicated memory entries
- Free/Standard users continue to use the advisor normally without memory features

### File to Modify

| File | Change |
|------|--------|
| `.lovable/plan.md` | Append full Penfield integration plan with Pro-only memory gating below existing tutorial fix |

