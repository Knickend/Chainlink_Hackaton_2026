import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a voice command parser for a financial dashboard. Extract structured data from natural language commands.

IMPORTANT: Users can ADD, UPDATE, or DELETE items. Analyze the intent carefully.

Supported actions and their required/optional fields:

ADD_ASSET: { action: "ADD_ASSET", data: { name: string, category: "banking"|"crypto"|"stocks"|"commodities", value: number, currency?: string, quantity?: number, symbol?: string } }
UPDATE_ASSET: { action: "UPDATE_ASSET", data: { name: string, value?: number, quantity?: number } }
DELETE_ASSET: { action: "DELETE_ASSET", data: { name: string } }

ADD_INCOME: { action: "ADD_INCOME", data: { source: string, amount: number, type: "work"|"passive"|"investment"|"mining", currency?: string, is_recurring?: boolean, income_date?: string } }
UPDATE_INCOME: { action: "UPDATE_INCOME", data: { source: string, amount?: number, income_date?: string } }
DELETE_INCOME: { action: "DELETE_INCOME", data: { source: string } }

ADD_EXPENSE: { action: "ADD_EXPENSE", data: { name: string, amount: number, category: "Housing"|"Food"|"Transportation"|"Healthcare"|"Entertainment"|"Lifestyle"|"Education"|"Savings"|"Other", is_recurring: boolean, currency?: string, expense_date?: string } }
UPDATE_EXPENSE: { action: "UPDATE_EXPENSE", data: { name: string, amount?: number, expense_date?: string } }
DELETE_EXPENSE: { action: "DELETE_EXPENSE", data: { name: string } }

ADD_DEBT: { action: "ADD_DEBT", data: { name: string, debt_type: "mortgage"|"car_loan"|"personal_loan"|"credit_card"|"student_loan"|"other", principal_amount: number, interest_rate: number, currency?: string, monthly_payment?: number } }
UPDATE_DEBT: { action: "UPDATE_DEBT", data: { name: string, principal_amount?: number, interest_rate?: number, monthly_payment?: number } }
DELETE_DEBT: { action: "DELETE_DEBT", data: { name: string } }

ADD_GOAL: { action: "ADD_GOAL", data: { name: string, category: "emergency_fund"|"vacation"|"major_purchase"|"retirement"|"education"|"other", target_amount: number, currency?: string, current_amount?: number, monthly_contribution?: number } }
UPDATE_GOAL: { action: "UPDATE_GOAL", data: { name: string, target_amount?: number, current_amount?: number, monthly_contribution?: number } }
DELETE_GOAL: { action: "DELETE_GOAL", data: { name: string } }

SEND_USDC: { action: "SEND_USDC", data: { amount: number, recipient: string } }
TRADE_TOKENS: { action: "TRADE_TOKENS", data: { amount: number, from_token: string, to_token: string } }
FUND_WALLET: { action: "FUND_WALLET", data: { amount: number } }

QUESTION: { action: "QUESTION", data: { question: string } } // For general questions about finances

CLARIFY: { action: "CLARIFY", data: { message: string } } // When command is unclear

Guidelines:
- Default currency to "USD" if not specified
- For expenses, infer is_recurring from context (e.g., "monthly Netflix" = recurring, "bought groceries" = one-time)
- For crypto assets, always set category to "crypto" and include the symbol (BTC, ETH, etc.)
- For stock assets, set category to "stocks" and include the ticker symbol
- If the user mentions "savings account" or "checking account", category is "banking"
- Interest rates should be in percentage form (e.g., 6.5 for 6.5%)
- Parse amounts correctly: "$10k" = 10000, "10 thousand" = 10000

DATE EXTRACTION (CRITICAL):
- When the user mentions ANY date or relative time reference, you MUST include the appropriate date field.
- For expenses: include "expense_date" in YYYY-MM-DD format.
- For income: include "income_date" in YYYY-MM-DD format.
- Relative references to resolve (use today's date as reference):
  - "today" → today's date
  - "yesterday" → today minus 1 day
  - "N days ago" → today minus N days
  - "last week" → today minus 7 days
  - "last Monday/Tuesday/..." → most recent past occurrence of that weekday
  - Explicit dates like "Feb 20", "February 20th", "2025-02-20" → parse directly
- When expense_date or income_date is present, default is_recurring to false unless user explicitly says "monthly", "recurring", "every month", etc.
- NEVER omit the date when the user mentions one. This is a hard requirement.

Return ONLY valid JSON. No explanation.`;

// ---- Deterministic date post-processing ----

function resolveTemporalDate(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();

  // "today"
  if (/\btoday\b/.test(lower)) return formatDate(now);

  // "yesterday"
  if (/\byesterday\b/.test(lower)) return formatDate(addDays(now, -1));

  // "tomorrow"
  if (/\btomorrow\b/.test(lower)) return formatDate(addDays(now, 1));

  // "N days ago"
  const daysAgo = lower.match(/(\d+)\s*days?\s*ago/);
  if (daysAgo) return formatDate(addDays(now, -parseInt(daysAgo[1])));

  // "N weeks ago"
  const weeksAgo = lower.match(/(\d+)\s*weeks?\s*ago/);
  if (weeksAgo) return formatDate(addDays(now, -parseInt(weeksAgo[1]) * 7));

  // "last week"
  if (/\blast\s+week\b/.test(lower)) return formatDate(addDays(now, -7));

  // "last Monday/Tuesday/..." 
  const weekdayMatch = lower.match(/\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekdayMatch[1]);
    const currentDay = now.getDay();
    let diff = currentDay - targetDay;
    if (diff <= 0) diff += 7;
    return formatDate(addDays(now, -diff));
  }

  return null;
}

function hasTemporalReference(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(today|yesterday|tomorrow|\d+\s*days?\s*ago|\d+\s*weeks?\s*ago|last\s+week|last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/.test(lower);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Post-process parsed result to ensure dates are never lost
function postProcessParsed(parsed: any, originalText: string): any {
  const action = parsed?.action;
  if (!action) return parsed;

  const data = parsed.data || {};

  // Only apply to expense/income add/update
  const isExpenseAction = action === 'ADD_EXPENSE' || action === 'UPDATE_EXPENSE';
  const isIncomeAction = action === 'ADD_INCOME' || action === 'UPDATE_INCOME';

  if (!isExpenseAction && !isIncomeAction) return parsed;

  const dateField = isExpenseAction ? 'expense_date' : 'income_date';

  // If model already provided a date, trust it
  if (data[dateField]) {
    // Enforce recurrence default: date present → one-time unless explicitly recurring
    if ((action === 'ADD_EXPENSE' || action === 'ADD_INCOME') && data.is_recurring === undefined) {
      data.is_recurring = false;
    }
    return { ...parsed, data };
  }

  // If there's a temporal reference in the original text but model missed it, inject date
  if (hasTemporalReference(originalText)) {
    const resolved = resolveTemporalDate(originalText);
    if (resolved) {
      data[dateField] = resolved;
      // Date injected → default to one-time
      if ((action === 'ADD_EXPENSE' || action === 'ADD_INCOME') && data.is_recurring === undefined) {
        data.is_recurring = false;
      }
      console.log(`[Parser] Post-processing: injected ${dateField}=${resolved} from text`);
    }
  }

  return { ...parsed, data };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { text, addressBook } = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    console.log(`[Parser] Parsing command: "${text}"`);

    // Build address book context for recipient resolution
    let systemPromptWithContext = SYSTEM_PROMPT;
    if (addressBook && Array.isArray(addressBook) && addressBook.length > 0) {
      const contactLines = addressBook
        .filter((c: any) => c.wallet_address)
        .map((c: any) => `  ${c.name}: ${c.wallet_address}`)
        .join('\n');
      if (contactLines) {
        systemPromptWithContext += `\n\nUser's Address Book (resolve names to wallet addresses):\n${contactLines}\n\nWhen the user references a contact by name (e.g., "Send 50 USDC to Alice"), resolve the name to their wallet address and include "recipient_name" in the SEND_USDC data.`;
      }
    }

    // Inject today's date so the model can resolve relative references
    const todayStr = formatDate(new Date());
    systemPromptWithContext += `\n\nToday's date is: ${todayStr}. Use this to resolve relative dates like "yesterday", "3 days ago", etc.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPromptWithContext },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Parser] AI API error: ${response.status} - ${errorText}`);
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error(`[Parser] Failed to parse AI response: ${content}`);
      parsed = { action: 'CLARIFY', data: { message: "I didn't understand that. Could you rephrase?" } };
    }

    // Post-process to ensure dates are never silently dropped
    parsed = postProcessParsed(parsed, text);

    console.log(`[Parser] Parsed result:`, parsed);

    return new Response(
      JSON.stringify(parsed),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Parser] Error:', error);
    return new Response(
      JSON.stringify({ 
        action: 'CLARIFY', 
        data: { message: error instanceof Error ? error.message : 'Something went wrong. Please try again.' } 
      }),
      {
        status: 200, // Return 200 with CLARIFY action instead of error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
