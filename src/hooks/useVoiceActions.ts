import { useCallback } from 'react';
import { Asset, Income, Expense, Debt, Goal, DebtType, GoalCategory } from '@/lib/types';
import { GoalInput } from './useGoals';

export interface VoiceAction {
  action: string;
  data: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  needsConfirmation?: boolean;
  isQuestion?: boolean;
}

interface ActionHandlers {
  // Assets
  assets: Asset[];
  addAsset: (data: any) => Promise<void>;
  updateAsset: (id: string, data: any) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  // Income
  income: Income[];
  addIncome: (data: any) => Promise<void>;
  updateIncome: (id: string, data: any) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  
  // Expenses
  expenses: Expense[];
  addExpense: (data: any) => Promise<void>;
  updateExpense: (id: string, data: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Debts
  debts: Debt[];
  addDebt: (data: any) => Promise<void>;
  updateDebt: (id: string, data: any) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  
  // Goals
  goals: Goal[];
  addGoal: (data: GoalInput) => Promise<void>;
  updateGoal: (id: string, data: any) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Agent wallet (optional)
  sendUsdc?: (amount: number, recipient: string) => Promise<any>;
  tradeTokens?: (amount: number, fromToken: string, toToken: string) => Promise<any>;
  getTradeQuote?: (amount: number, fromToken: string, toToken: string) => Promise<any>;
  fundWallet?: (amount: number) => Promise<any>;
}

// Helper to find items by name (case-insensitive, partial match)
function findByName<T extends { name?: string; source?: string }>(
  items: T[],
  searchName: string,
  nameField: 'name' | 'source' = 'name'
): T | undefined {
  const search = searchName.toLowerCase().trim();
  
  // Try exact match first
  let found = items.find(item => {
    const itemName = (nameField === 'source' ? (item as any).source : item.name) || '';
    return itemName.toLowerCase() === search;
  });
  
  // Try partial match
  if (!found) {
    found = items.find(item => {
      const itemName = (nameField === 'source' ? (item as any).source : item.name) || '';
      return itemName.toLowerCase().includes(search) || search.includes(itemName.toLowerCase());
    });
  }
  
  return found;
}

export function useVoiceActions(handlers: ActionHandlers) {
  const executeAction = useCallback(async (command: VoiceAction): Promise<ActionResult> => {
    const { action, data } = command;
    
    console.log('[VoiceActions] Executing:', action, data);
    
    try {
      switch (action) {
        // ===== ASSETS =====
        case 'ADD_ASSET': {
          await handlers.addAsset({
            name: data.name,
            category: data.category || 'banking',
            value: data.value || 0,
            quantity: data.quantity,
            symbol: data.symbol,
          });
          const formatted = formatCurrency(data.value || 0, data.currency);
          return { success: true, message: `Added ${data.name} worth ${formatted} to your assets.` };
        }
        
        case 'UPDATE_ASSET': {
          const asset = findByName(handlers.assets, data.name);
          if (!asset) {
            return { success: false, message: `I couldn't find an asset called "${data.name}".` };
          }
          await handlers.updateAsset(asset.id, {
            value: data.value ?? asset.value,
            quantity: data.quantity ?? asset.quantity,
          });
          return { success: true, message: `Updated ${asset.name}.` };
        }
        
        case 'DELETE_ASSET': {
          const asset = findByName(handlers.assets, data.name);
          if (!asset) {
            return { success: false, message: `I couldn't find an asset called "${data.name}".` };
          }
          return { 
            success: false, 
            needsConfirmation: true, 
            message: `Are you sure you want to delete ${asset.name}?` 
          };
        }
        
        // ===== INCOME =====
        case 'ADD_INCOME': {
          await handlers.addIncome({
            source: data.source,
            amount: data.amount,
            type: data.type || 'work',
            currency: data.currency || 'USD',
          });
          const formatted = formatCurrency(data.amount, data.currency);
          return { success: true, message: `Added ${formatted} income from ${data.source}.` };
        }
        
        case 'UPDATE_INCOME': {
          const income = findByName(handlers.income as any[], data.source, 'source');
          if (!income) {
            return { success: false, message: `I couldn't find income from "${data.source}".` };
          }
          await handlers.updateIncome((income as any).id, {
            amount: data.amount ?? (income as any).amount,
          });
          return { success: true, message: `Updated income from ${data.source}.` };
        }
        
        case 'DELETE_INCOME': {
          const income = findByName(handlers.income as any[], data.source, 'source');
          if (!income) {
            return { success: false, message: `I couldn't find income from "${data.source}".` };
          }
          return { 
            success: false, 
            needsConfirmation: true, 
            message: `Are you sure you want to delete income from ${data.source}?` 
          };
        }
        
        // ===== EXPENSES =====
        case 'ADD_EXPENSE': {
          await handlers.addExpense({
            name: data.name,
            amount: data.amount,
            category: data.category || 'Other',
            is_recurring: data.is_recurring ?? true,
            currency: data.currency || 'USD',
          });
          const formatted = formatCurrency(data.amount, data.currency);
          const recurring = data.is_recurring ? 'recurring' : 'one-time';
          return { success: true, message: `Added ${data.name} as a ${recurring} ${formatted} expense.` };
        }
        
        case 'UPDATE_EXPENSE': {
          const expense = findByName(handlers.expenses as any[], data.name);
          if (!expense) {
            return { success: false, message: `I couldn't find an expense called "${data.name}".` };
          }
          await handlers.updateExpense((expense as any).id, {
            amount: data.amount ?? (expense as any).amount,
          });
          return { success: true, message: `Updated ${data.name} expense.` };
        }
        
        case 'DELETE_EXPENSE': {
          const expense = findByName(handlers.expenses as any[], data.name);
          if (!expense) {
            return { success: false, message: `I couldn't find an expense called "${data.name}".` };
          }
          return { 
            success: false, 
            needsConfirmation: true, 
            message: `Are you sure you want to delete ${data.name} expense?` 
          };
        }
        
        // ===== DEBTS =====
        case 'ADD_DEBT': {
          await handlers.addDebt({
            name: data.name,
            debt_type: (data.debt_type as DebtType) || 'other',
            principal_amount: data.principal_amount,
            interest_rate: data.interest_rate || 0,
            monthly_payment: data.monthly_payment,
            currency: data.currency || 'USD',
          });
          const formatted = formatCurrency(data.principal_amount, data.currency);
          return { success: true, message: `Added ${data.name} debt of ${formatted}.` };
        }
        
        case 'UPDATE_DEBT': {
          const debt = findByName(handlers.debts as any[], data.name);
          if (!debt) {
            return { success: false, message: `I couldn't find a debt called "${data.name}".` };
          }
          await handlers.updateDebt((debt as any).id, {
            principal_amount: data.principal_amount ?? debt.principal_amount,
            interest_rate: data.interest_rate ?? debt.interest_rate,
            monthly_payment: data.monthly_payment ?? debt.monthly_payment,
          });
          return { success: true, message: `Updated ${data.name} debt.` };
        }
        
        case 'DELETE_DEBT': {
          const debt = findByName(handlers.debts as any[], data.name);
          if (!debt) {
            return { success: false, message: `I couldn't find a debt called "${data.name}".` };
          }
          return { 
            success: false, 
            needsConfirmation: true, 
            message: `Are you sure you want to delete ${data.name}?` 
          };
        }
        
        // ===== GOALS =====
        case 'ADD_GOAL': {
          await handlers.addGoal({
            name: data.name,
            category: (data.category as GoalCategory) || 'other',
            target_amount: data.target_amount,
            current_amount: data.current_amount || 0,
            currency: data.currency || 'USD',
            monthly_contribution: data.monthly_contribution,
          });
          const formatted = formatCurrency(data.target_amount, data.currency);
          return { success: true, message: `Added goal: ${data.name} with target of ${formatted}.` };
        }
        
        case 'UPDATE_GOAL': {
          const goal = findByName(handlers.goals as any[], data.name);
          if (!goal) {
            return { success: false, message: `I couldn't find a goal called "${data.name}".` };
          }
          await handlers.updateGoal((goal as any).id, {
            target_amount: data.target_amount ?? goal.target_amount,
            current_amount: data.current_amount ?? goal.current_amount,
            monthly_contribution: data.monthly_contribution ?? goal.monthly_contribution,
          });
          return { success: true, message: `Updated ${data.name} goal.` };
        }
        
        case 'DELETE_GOAL': {
          const goal = findByName(handlers.goals as any[], data.name);
          if (!goal) {
            return { success: false, message: `I couldn't find a goal called "${data.name}".` };
          }
          return { 
            success: false, 
            needsConfirmation: true, 
            message: `Are you sure you want to delete ${data.name} goal?` 
          };
        }
        
        // ===== DEFI ACTIONS (Agent Wallet) =====
        case 'SEND_USDC': {
          return {
            success: false,
            needsConfirmation: true,
            message: `Send ${data.amount} USDC to ${data.recipient} on Base — approve or reject?`,
          };
        }

        case 'TRADE_TOKENS': {
          // Fetch quote to show estimated output
          let quoteMsg = `Swap ${data.amount} ${data.from_token || 'USDC'} for ${data.to_token || 'ETH'} on Base`;
          if (handlers.getTradeQuote) {
            try {
              const quote = await handlers.getTradeQuote(data.amount, data.from_token || 'USDC', data.to_token || 'ETH');
              if (quote?.to_amount) {
                quoteMsg = `Swap ${data.amount} ${data.from_token || 'USDC'} for ~${Number(quote.to_amount).toFixed(8)} ${data.to_token || 'ETH'} on Base`;
                data._quote_amount = quote.to_amount;
              }
            } catch { /* proceed without quote */ }
          }
          return {
            success: false,
            needsConfirmation: true,
            message: `${quoteMsg} — approve or reject?`,
          };
        }

        case 'FUND_WALLET': {
          return {
            success: false,
            needsConfirmation: true,
            message: `Fund your agent wallet with $${data.amount} via Coinbase Onramp — approve or reject?`,
          };
        }

        // ===== QUESTION =====
        case 'QUESTION':
          return { success: true, isQuestion: true, message: '' };
        
        // ===== CLARIFY =====
        case 'CLARIFY':
          return { success: false, message: data.message || "I didn't understand that. Could you rephrase?" };
        
        default:
          return { success: false, message: "I'm not sure how to do that. Try asking differently." };
      }
    } catch (error) {
      console.error('[VoiceActions] Error:', error);
      return { 
        success: false, 
        message: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }, [handlers]);

  const confirmDelete = useCallback(async (
    action: string,
    data: Record<string, any>
  ): Promise<ActionResult> => {
    try {
      switch (action) {
        case 'DELETE_ASSET': {
          const asset = findByName(handlers.assets, data.name);
          if (asset) {
            await handlers.deleteAsset(asset.id);
            return { success: true, message: `Deleted ${asset.name}.` };
          }
          break;
        }
        case 'DELETE_INCOME': {
          const income = findByName(handlers.income as any[], data.source, 'source');
          if (income) {
            await handlers.deleteIncome((income as any).id);
            return { success: true, message: `Deleted income from ${data.source}.` };
          }
          break;
        }
        case 'DELETE_EXPENSE': {
          const expense = findByName(handlers.expenses as any[], data.name);
          if (expense) {
            await handlers.deleteExpense((expense as any).id);
            return { success: true, message: `Deleted ${data.name} expense.` };
          }
          break;
        }
        case 'DELETE_DEBT': {
          const debt = findByName(handlers.debts as any[], data.name);
          if (debt) {
            await handlers.deleteDebt((debt as any).id);
            return { success: true, message: `Deleted ${data.name} debt.` };
          }
          break;
        }
        case 'DELETE_GOAL': {
          const goal = findByName(handlers.goals as any[], data.name);
          if (goal) {
            await handlers.deleteGoal((goal as any).id);
            return { success: true, message: `Deleted ${data.name} goal.` };
          }
          break;
        }
      }
      return { success: false, message: "Couldn't complete the deletion." };
    } catch (error) {
      console.error('[VoiceActions] Delete error:', error);
      return { 
        success: false, 
        message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }, [handlers]);

  const confirmAction = useCallback(async (
    action: string,
    data: Record<string, any>
  ): Promise<ActionResult> => {
    try {
      switch (action) {
        case 'SEND_USDC': {
          if (!handlers.sendUsdc) return { success: false, message: 'Agent wallet not connected.' };
          const result = await handlers.sendUsdc(data.amount, data.recipient);
          return { success: true, message: result?.message || `Sent ${data.amount} USDC to ${data.recipient_name || data.recipient}.` };
        }
        case 'TRADE_TOKENS': {
          if (!handlers.tradeTokens) return { success: false, message: 'Agent wallet not connected.' };
          const result = await handlers.tradeTokens(data.amount, data.from_token || 'USDC', data.to_token || 'ETH');
          return { success: true, message: result?.message || `Swapped ${data.amount} ${data.from_token} for ${data.to_token}.` };
        }
        case 'FUND_WALLET': {
          if (!handlers.fundWallet) return { success: false, message: 'Agent wallet not connected.' };
          const result = await handlers.fundWallet(data.amount);
          if (result?.onramp_url) {
            window.open(result.onramp_url, '_blank', 'noopener,noreferrer');
          }
          const msg = result?.onramp_url
            ? `Onramp session created for $${data.amount}. A payment window has been opened. [Click here if it didn't open](${result.onramp_url})`
            : result?.message || `Funding initiated for $${data.amount}.`;
          return { success: true, message: msg };
        }
        default:
          return { success: false, message: "Unknown DeFi action." };
      }
    } catch (error) {
      console.error('[VoiceActions] DeFi action error:', error);
      return {
        success: false,
        message: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }, [handlers]);

  return { executeAction, confirmDelete, confirmAction };
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
