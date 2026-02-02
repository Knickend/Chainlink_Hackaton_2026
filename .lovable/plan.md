

## Voice-Enabled Dashboard Actions with ElevenLabs

This plan extends the voice Financial Advisor feature to allow users to add, update, and delete dashboard entries using natural voice commands.

---

### What You'll Be Able to Do

Speak commands like:
- "Add $500 to my Chase savings account"
- "Add a $50 monthly Netflix expense under Lifestyle"
- "Add 0.5 Bitcoin to my portfolio"
- "Delete my Netflix expense"
- "Add a new goal: save $10,000 for a vacation"
- "Add $25,000 mortgage debt with 6% interest rate"

---

### How It Works

```text
User speaks command
        ↓
Speech-to-Text (ElevenLabs)
        ↓
AI parses intent + extracts data
        ↓
Action executed on dashboard
        ↓
Confirmation spoken back (Text-to-Speech)
```

---

### Supported Voice Actions

| Category | Add | Update | Delete |
|----------|-----|--------|--------|
| Assets (Banking, Crypto, Stocks, Commodities) | Yes | Yes | Yes |
| Income (Work, Passive, Investment, Mining) | Yes | Yes | Yes |
| Expenses (Recurring, One-time) | Yes | Yes | Yes |
| Debts (Mortgage, Credit Card, Loans) | Yes | Yes | Yes |
| Goals (Savings targets) | Yes | Yes | Yes |

---

### Implementation Steps

#### Step 1: Create Voice Command Parser Edge Function

Create `supabase/functions/parse-voice-command/index.ts`:
- Receives transcribed text from user's voice
- Uses AI to extract structured action data
- Returns JSON with action type and parameters
- Handles ambiguous commands by asking for clarification

#### Step 2: Extend Voice Chat Hook

Update `src/hooks/useVoiceChat.ts`:
- Add `parseVoiceCommand` function
- Detect when user is giving a command vs. asking a question
- Route commands to appropriate action handlers

#### Step 3: Create Voice Action Handler Hook

Create `src/hooks/useVoiceActions.ts`:
- Accepts parsed command data
- Calls the appropriate portfolio/debt/goal mutation
- Returns success/failure status for voice feedback
- Handles confirmation for destructive actions (delete)

#### Step 4: Update Financial Advisor Chat

Enhance `src/components/FinancialAdvisorChat.tsx`:
- Add action confirmation UI for voice commands
- Show visual feedback when actions are executed
- Display undo option for recent actions
- Integrate voice action results into chat history

#### Step 5: Add Command Confirmation Flow

For destructive/sensitive actions:
- "Did you mean to delete your Netflix expense?"
- User confirms with "Yes" or "No"
- Action only executes after confirmation

---

### Technical Details

**New Files:**

| File | Purpose |
|------|---------|
| `supabase/functions/parse-voice-command/index.ts` | AI-powered command parsing |
| `src/hooks/useVoiceActions.ts` | Execute parsed commands |

**Modified Files:**

| File | Changes |
|------|---------|
| `src/hooks/useVoiceChat.ts` | Add command detection and routing |
| `src/components/FinancialAdvisorChat.tsx` | Add action confirmation UI |
| `supabase/config.toml` | Register new edge function |

**Voice Command Parser Function:**

```typescript
// supabase/functions/parse-voice-command/index.ts

const SYSTEM_PROMPT = `You are a voice command parser for a financial dashboard. 
Extract structured data from natural language commands.

Supported actions:
- ADD_ASSET: { action: "ADD_ASSET", data: { name, category, value, currency?, quantity?, symbol? } }
- DELETE_ASSET: { action: "DELETE_ASSET", data: { name } }
- ADD_INCOME: { action: "ADD_INCOME", data: { source, amount, type, currency } }
- DELETE_INCOME: { action: "DELETE_INCOME", data: { source } }
- ADD_EXPENSE: { action: "ADD_EXPENSE", data: { name, amount, category, is_recurring, currency } }
- DELETE_EXPENSE: { action: "DELETE_EXPENSE", data: { name } }
- ADD_DEBT: { action: "ADD_DEBT", data: { name, debt_type, principal_amount, interest_rate, currency } }
- DELETE_DEBT: { action: "DELETE_DEBT", data: { name } }
- ADD_GOAL: { action: "ADD_GOAL", data: { name, category, target_amount, currency } }
- DELETE_GOAL: { action: "DELETE_GOAL", data: { name } }
- QUESTION: { action: "QUESTION", data: { question } } // For general questions

Return JSON only. If unclear, return { action: "CLARIFY", message: "..." }`;

// AI parses the voice command and returns structured JSON
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${LOVABLE_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: transcribedText }
    ],
    response_format: { type: "json_object" }
  }),
});
```

**Voice Actions Hook:**

```typescript
// src/hooks/useVoiceActions.ts

interface VoiceAction {
  action: string;
  data: Record<string, any>;
}

export function useVoiceActions({
  addAsset, deleteAsset,
  addIncome, deleteIncome,
  addExpense, deleteExpense,
  addDebt, deleteDebt,
  addGoal, deleteGoal,
}: ActionHandlers) {
  
  const executeAction = async (command: VoiceAction): Promise<ActionResult> => {
    switch (command.action) {
      case 'ADD_ASSET':
        await addAsset(command.data);
        return { success: true, message: `Added ${command.data.name} to your assets` };
        
      case 'DELETE_ASSET':
        // Find asset by name, then delete
        const asset = findAssetByName(command.data.name);
        if (asset) {
          await deleteAsset(asset.id);
          return { success: true, message: `Deleted ${command.data.name}` };
        }
        return { success: false, message: `Couldn't find asset: ${command.data.name}` };
        
      case 'ADD_EXPENSE':
        await addExpense(command.data);
        return { success: true, message: `Added ${command.data.name} expense` };
        
      // ... similar for other action types
        
      case 'CLARIFY':
        return { success: false, needsClarification: true, message: command.data.message };
        
      case 'QUESTION':
        return { success: true, isQuestion: true };
        
      default:
        return { success: false, message: 'Unknown command' };
    }
  };
  
  return { executeAction };
}
```

**Enhanced Chat Component Flow:**

```tsx
// In FinancialAdvisorChat.tsx

const handleVoiceCommand = async (transcribedText: string) => {
  // 1. Parse the command
  const { data: parsed } = await supabase.functions.invoke('parse-voice-command', {
    body: { text: transcribedText }
  });
  
  // 2. If it's a question, route to normal chat
  if (parsed.action === 'QUESTION') {
    await sendMessage(transcribedText);
    return;
  }
  
  // 3. If destructive action, ask for confirmation
  if (parsed.action.startsWith('DELETE_')) {
    setPendingAction(parsed);
    await playResponse(`Are you sure you want to delete ${parsed.data.name}?`);
    return;
  }
  
  // 4. Execute the action
  const result = await executeAction(parsed);
  
  // 5. Speak confirmation
  await playResponse(result.message);
  
  // 6. Add to chat history
  setMessages(prev => [...prev, 
    { role: 'user', content: transcribedText },
    { role: 'assistant', content: result.message }
  ]);
};
```

**Confirmation UI:**

```tsx
// Pending action confirmation card in chat
{pendingAction && (
  <div className="bg-warning/10 border border-warning rounded-lg p-4">
    <p className="font-medium">Confirm Action</p>
    <p className="text-sm text-muted-foreground">
      Delete "{pendingAction.data.name}"?
    </p>
    <div className="flex gap-2 mt-3">
      <Button size="sm" variant="destructive" onClick={confirmAction}>
        Yes, delete
      </Button>
      <Button size="sm" variant="outline" onClick={cancelAction}>
        Cancel
      </Button>
    </div>
  </div>
)}
```

---

### Example Conversations

**Adding an asset:**
```
You: "Add $10,000 to my Schwab brokerage account"
AI: "Added Schwab brokerage account with $10,000 to your assets"
```

**Adding an expense:**
```
You: "Add a $15 monthly Spotify expense"
AI: "Added Spotify as a recurring $15 Lifestyle expense"
```

**Deleting with confirmation:**
```
You: "Delete my car loan"
AI: "Are you sure you want to delete your car loan?"
You: "Yes"
AI: "Car loan has been deleted"
```

**Ambiguous command:**
```
You: "Add 500 for groceries"
AI: "Is that a one-time expense or a monthly recurring expense?"
You: "Monthly"
AI: "Added groceries as a recurring $500 expense under Food"
```

---

### Dependencies on Voice Chat Plan

This plan builds on the previously approved Voice-Enabled Financial Advisor plan. It requires:
- ElevenLabs TTS function (`elevenlabs-tts`)
- ElevenLabs STT function (`elevenlabs-stt`)
- Voice chat hook (`useVoiceChat`)
- Voice mode toggle in chat UI

---

### Implementation Order

1. First, implement the base Voice Chat feature (TTS + STT)
2. Then, add the command parsing edge function
3. Create the voice actions hook
4. Update the chat component with action handling
5. Add confirmation flows and undo capability

