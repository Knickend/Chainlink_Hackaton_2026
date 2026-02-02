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

ADD_INCOME: { action: "ADD_INCOME", data: { source: string, amount: number, type: "work"|"passive"|"investment"|"mining", currency?: string } }
UPDATE_INCOME: { action: "UPDATE_INCOME", data: { source: string, amount?: number } }
DELETE_INCOME: { action: "DELETE_INCOME", data: { source: string } }

ADD_EXPENSE: { action: "ADD_EXPENSE", data: { name: string, amount: number, category: "Housing"|"Food"|"Transportation"|"Healthcare"|"Entertainment"|"Lifestyle"|"Education"|"Savings"|"Other", is_recurring: boolean, currency?: string } }
UPDATE_EXPENSE: { action: "UPDATE_EXPENSE", data: { name: string, amount?: number } }
DELETE_EXPENSE: { action: "DELETE_EXPENSE", data: { name: string } }

ADD_DEBT: { action: "ADD_DEBT", data: { name: string, debt_type: "mortgage"|"car_loan"|"personal_loan"|"credit_card"|"student_loan"|"other", principal_amount: number, interest_rate: number, currency?: string, monthly_payment?: number } }
UPDATE_DEBT: { action: "UPDATE_DEBT", data: { name: string, principal_amount?: number, interest_rate?: number, monthly_payment?: number } }
DELETE_DEBT: { action: "DELETE_DEBT", data: { name: string } }

ADD_GOAL: { action: "ADD_GOAL", data: { name: string, category: "emergency_fund"|"vacation"|"major_purchase"|"retirement"|"education"|"other", target_amount: number, currency?: string, current_amount?: number, monthly_contribution?: number } }
UPDATE_GOAL: { action: "UPDATE_GOAL", data: { name: string, target_amount?: number, current_amount?: number, monthly_contribution?: number } }
DELETE_GOAL: { action: "DELETE_GOAL", data: { name: string } }

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

Return ONLY valid JSON. No explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    console.log(`[Parser] Parsing command: "${text}"`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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
