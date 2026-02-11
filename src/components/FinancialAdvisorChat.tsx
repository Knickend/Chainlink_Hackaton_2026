import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX, AlertTriangle, Wifi, WifiOff, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useVoiceActions, VoiceAction } from '@/hooks/useVoiceActions';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useChatMemories } from '@/hooks/useChatMemories';

import { Asset, Income, Expense, Debt, Goal, getCurrencySymbol } from '@/lib/types';

function buildPortfolioSummary(
  assets: Asset[],
  income: Income[],
  expenses: Expense[],
  debts: Debt[],
  goals: Goal[],
): string {
  const lines: string[] = ['## Current Portfolio Snapshot'];

  // Assets
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  lines.push(`\nAssets (${assets.length} total, $${totalAssets.toLocaleString('en-US', { maximumFractionDigits: 0 })}):`);
  const categoryLabels: Record<string, string> = {
    banking: 'Cash & Stablecoins',
    crypto: 'Cryptocurrency',
    stocks: 'Stocks, Bonds & ETFs',
    commodities: 'Commodities',
    realestate: 'Real Estate',
  };
  const grouped = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});
  for (const [cat, items] of Object.entries(grouped)) {
    const catTotal = items.reduce((s, a) => s + a.value, 0);
    lines.push(`- ${categoryLabels[cat] || cat} ($${catTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}):`);
    for (const a of items.slice(0, 5)) {
      const detail = a.quantity ? ` — ${a.quantity} ${a.symbol || ''}` : '';
      lines.push(`  • ${a.name}${detail} ($${a.value.toLocaleString('en-US', { maximumFractionDigits: 0 })})`);
    }
    if (items.length > 5) lines.push(`  • ... and ${items.length - 5} more`);
  }

  // Income
  const recurring = income.filter(i => i.is_recurring);
  const oneTime = income.filter(i => !i.is_recurring);
  const recurringTotal = recurring.reduce((s, i) => s + i.amount, 0);
  const oneTimeTotal = oneTime.reduce((s, i) => s + i.amount, 0);
  lines.push(`\nMonthly Income: $${recurringTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${recurring.length} recurring)${oneTime.length ? ` + $${oneTimeTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${oneTime.length} one-time)` : ''}`);

  // Expenses
  const recurringExp = expenses.filter(e => e.is_recurring);
  const oneTimeExp = expenses.filter(e => !e.is_recurring);
  const recurringExpTotal = recurringExp.reduce((s, e) => s + e.amount, 0);
  const oneTimeExpTotal = oneTimeExp.reduce((s, e) => s + e.amount, 0);
  lines.push(`Monthly Expenses: $${recurringExpTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${recurringExp.length} recurring)${oneTimeExp.length ? ` + $${oneTimeExpTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${oneTimeExp.length} one-time)` : ''}`);

  // Debts
  if (debts.length > 0) {
    const totalDebt = debts.reduce((s, d) => s + d.principal_amount, 0);
    const debtDetails = debts.map(d => `${d.name} (${d.debt_type}, ${getCurrencySymbol(d.currency)}${d.principal_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}, ${d.interest_rate}% APR${d.monthly_payment ? `, ${getCurrencySymbol(d.currency)}${d.monthly_payment}/mo` : ''})`).join(', ');
    lines.push(`\nDebts ($${totalDebt.toLocaleString('en-US', { maximumFractionDigits: 0 })} total): ${debtDetails}`);
  }

  // Goals
  if (goals.length > 0) {
    lines.push(`\nGoals:`);
    for (const g of goals) {
      const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
      lines.push(`- ${g.name} (${g.category}): ${getCurrencySymbol(g.currency)}${g.current_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} / ${getCurrencySymbol(g.currency)}${g.target_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pct}%)${g.is_completed ? ' ✅' : ''}`);
    }
  }

  return lines.join('\n');
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isAction?: boolean;
}

interface PendingAction {
  action: string;
  data: Record<string, any>;
}

// Props to receive shared state from parent
interface FinancialAdvisorChatProps {
  portfolioData?: {
    assets: Asset[];
    income: Income[];
    expenses: Expense[];
    addAsset: (data: any) => Promise<void>;
    updateAsset: (id: string, data: any) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    addIncome: (data: any) => Promise<void>;
    updateIncome: (id: string, data: any) => Promise<void>;
    deleteIncome: (id: string) => Promise<void>;
    addExpense: (data: any) => Promise<void>;
    updateExpense: (id: string, data: any) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
  };
  debtsData?: {
    debts: Debt[];
    addDebt: (data: any) => Promise<void>;
    updateDebt: (id: string, data: any) => Promise<void>;
    deleteDebt: (id: string) => Promise<void>;
  };
  goalsData?: {
    goals: Goal[];
    addGoal: (data: any) => Promise<void>;
    updateGoal: (id: string, data: any) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
  };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-advisor`;

const SUGGESTED_QUESTIONS = [
  "How should I prioritize paying off debt vs investing?",
  "What's a good emergency fund size?",
  "Explain the 50/30/20 budget rule",
  "How do I diversify my portfolio?",
];

export function FinancialAdvisorChat({ portfolioData, debtsData, goalsData }: FinancialAdvisorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const { recallMemories, storeConversationTurn } = useChatMemories(isPro);

  // Voice chat hook with fallback callback
  const {
    voiceMode,
    setVoiceMode,
    isRecording,
    isPlaying,
    playingMessageId,
    startRecording,
    stopRecording,
    transcribeAudio,
    playResponse,
    stopPlayback,
    parseVoiceCommand,
    sttProvider,
    ttsProvider,
    isUsingFallback,
    startWebSpeechRecording,
    isWebSpeechSTTSupported,
    isWebSpeechTTSSupported,
  } = useVoiceChat({
    onFallbackActivated: (provider) => {
      setShowFallbackBanner(true);
      toast({
        title: 'Using browser voice',
        description: 'Premium voice is unavailable. Using your browser\'s built-in speech.',
      });
    },
  });

  // Internal hooks (used as fallback when props not provided)
  const internalPortfolio = usePortfolio();
  const internalDebts = useDebts();
  const internalGoals = useGoals();

  // Use props if provided, otherwise fall back to internal hooks
  const assets = portfolioData?.assets ?? internalPortfolio.assets;
  const income = portfolioData?.income ?? internalPortfolio.income;
  const expenses = portfolioData?.expenses ?? internalPortfolio.expenses;
  const addAsset = portfolioData?.addAsset ?? internalPortfolio.addAsset;
  const updateAsset = portfolioData?.updateAsset ?? internalPortfolio.updateAsset;
  const deleteAsset = portfolioData?.deleteAsset ?? internalPortfolio.deleteAsset;
  const addIncome = portfolioData?.addIncome ?? internalPortfolio.addIncome;
  const updateIncome = portfolioData?.updateIncome ?? internalPortfolio.updateIncome;
  const deleteIncome = portfolioData?.deleteIncome ?? internalPortfolio.deleteIncome;
  const addExpense = portfolioData?.addExpense ?? internalPortfolio.addExpense;
  const updateExpense = portfolioData?.updateExpense ?? internalPortfolio.updateExpense;
  const deleteExpense = portfolioData?.deleteExpense ?? internalPortfolio.deleteExpense;

  const debts = debtsData?.debts ?? internalDebts.debts;
  const addDebt = debtsData?.addDebt ?? internalDebts.addDebt;
  const updateDebt = debtsData?.updateDebt ?? internalDebts.updateDebt;
  const deleteDebt = debtsData?.deleteDebt ?? internalDebts.deleteDebt;

  const goals = goalsData?.goals ?? internalGoals.goals;
  const addGoal = goalsData?.addGoal ?? internalGoals.addGoal;
  const updateGoal = goalsData?.updateGoal ?? internalGoals.updateGoal;
  const deleteGoal = goalsData?.deleteGoal ?? internalGoals.deleteGoal;

  // Voice actions hook
  const { executeAction, confirmDelete } = useVoiceActions({
    assets,
    income,
    expenses,
    debts,
    goals,
    addAsset,
    updateAsset,
    deleteAsset,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
    addDebt,
    updateDebt,
    deleteDebt,
    addGoal,
    updateGoal,
    deleteGoal,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && !voiceMode) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, voiceMode]);

  const streamChat = useCallback(async (userMessage: string, allMessages: Message[], memories?: Array<{ content: string; memory_type: string; created_at: string }>, portfolioContext?: string) => {
    const body: Record<string, any> = {
      messages: allMessages.map(m => ({ role: m.role, content: m.content })),
    };
    if (memories && memories.length > 0) {
      body.memories = memories;
    }
    if (portfolioContext) {
      body.portfolioContext = portfolioContext;
    }

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${resp.status}`);
    }

    if (!resp.body) {
      throw new Error('No response body');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: 'assistant', content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  }, []);

  const sendMessage = useCallback(async (messageText?: string, skipVoicePlayback = false) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Pro users: recall relevant memories for context
      const memories = isPro ? await recallMemories() : undefined;

      // Build portfolio context from current dashboard data
      const portfolioContext = buildPortfolioSummary(assets, income, expenses, debts, goals);

      const assistantContent = await streamChat(text, newMessages, memories, portfolioContext);
      
      // Pro users: store conversation turn for future recall
      if (isPro && assistantContent) {
        storeConversationTurn(text, assistantContent);
      }

      // Auto-play response in voice mode
      if (voiceMode && !skipVoicePlayback && assistantContent) {
        const plainText = assistantContent.replace(/[#*`_~\[\]]/g, '').substring(0, 1000);
        await playResponse(plainText, messages.length);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Please try again.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, streamChat, voiceMode, playResponse, isPro, recallMemories, storeConversationTurn]);

  const handleVoiceCommand = useCallback(async (transcribedText: string) => {
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: transcribedText }]);
    setIsLoading(true);

    try {
      // Parse the command
      const parsed = await parseVoiceCommand(transcribedText);
      
      // If it's a question, route to normal chat
      if (parsed.action === 'QUESTION') {
        setIsLoading(false);
        await sendMessage(transcribedText, false);
        return;
      }

      // Execute the action
      const result = await executeAction(parsed);

      // Handle confirmation needed
      if (result.needsConfirmation) {
        setPendingAction({ action: parsed.action, data: parsed.data });
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.message,
          isAction: true,
        }]);
        if (voiceMode) {
          await playResponse(result.message);
        }
      } else {
        // Add result to chat
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.message,
          isAction: result.success,
        }]);
        
        // Speak confirmation
        if (voiceMode) {
          await playResponse(result.message);
        }
      }
    } catch (error) {
      console.error('Voice command error:', error);
      const errorMessage = `Something went wrong: ${error instanceof Error ? error.message : 'Please try again.'}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  }, [parseVoiceCommand, executeAction, sendMessage, voiceMode, playResponse]);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return;
    
    setIsLoading(true);
    try {
      const result = await confirmDelete(pendingAction.action, pendingAction.data);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.message,
        isAction: result.success,
      }]);
      
      if (voiceMode) {
        await playResponse(result.message);
      }
      
      if (result.success) {
        toast({ title: result.message });
      }
    } catch (error) {
      console.error('Confirm action error:', error);
    } finally {
      setPendingAction(null);
      setIsLoading(false);
    }
  }, [pendingAction, confirmDelete, voiceMode, playResponse, toast]);

  const handleCancelAction = useCallback(() => {
    setPendingAction(null);
    setMessages(prev => [...prev, { role: 'assistant', content: 'Okay, cancelled.' }]);
    if (voiceMode) {
      playResponse('Okay, cancelled.');
    }
  }, [voiceMode, playResponse]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) return;
    
    // If using Web Speech API, start real-time recognition
    if (sttProvider === 'webspeech' || !isWebSpeechSTTSupported) {
      try {
        setIsLoading(true);
        const transcribedText = await startWebSpeechRecording();
        
        if (transcribedText && transcribedText.trim().length > 0) {
          await handleVoiceCommand(transcribedText);
        } else {
          toast({
            variant: 'destructive',
            title: 'Could not understand',
            description: 'Please try speaking more clearly.',
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Web Speech error:', error);
        toast({
          variant: 'destructive',
          title: 'Voice input failed',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
        setIsLoading(false);
      }
      return;
    }
    
    // Standard MediaRecorder flow for ElevenLabs
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        variant: 'destructive',
        title: 'Microphone access required',
        description: 'Please enable microphone access to use voice features.',
      });
    }
  }, [isRecording, sttProvider, isWebSpeechSTTSupported, startWebSpeechRecording, startRecording, handleVoiceCommand, toast]);

  const handleMicRelease = useCallback(async () => {
    // If using Web Speech API, the recording is handled in handleMicPress
    if (sttProvider === 'webspeech') {
      return;
    }
    
    if (!isRecording) return;
    
    setIsLoading(true);
    try {
      const audioBlob = await stopRecording();
      if (!audioBlob || audioBlob.size < 1000) {
        toast({
          variant: 'destructive',
          title: 'Recording too short',
          description: 'Please hold the button longer while speaking.',
        });
        setIsLoading(false);
        return;
      }

      // Transcribe the audio
      const transcribedText = await transcribeAudio(audioBlob);
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        toast({
          variant: 'destructive',
          title: 'Could not understand',
          description: 'Please try speaking more clearly.',
        });
        setIsLoading(false);
        return;
      }

      // Handle the voice command
      await handleVoiceCommand(transcribedText);
    } catch (error) {
      console.error('Voice input error:', error);
      
      // Check if fallback was activated
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage === 'FALLBACK_ACTIVATED') {
        toast({
          title: 'Switched to browser voice',
          description: 'Please speak again using the mic button.',
        });
        setIsLoading(false);
        return;
      }
      
      toast({
        variant: 'destructive',
        title: 'Voice input failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      setIsLoading(false);
    }
  }, [isRecording, sttProvider, stopRecording, transcribeAudio, handleVoiceCommand, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePlayMessage = useCallback(async (content: string, messageIndex: number) => {
    if (isPlaying && playingMessageId === messageIndex) {
      stopPlayback();
      return;
    }
    
    // Extract plain text from markdown for TTS
    const plainText = content.replace(/[#*`_~\[\]]/g, '').substring(0, 1000);
    await playResponse(plainText, messageIndex);
  }, [isPlaying, playingMessageId, stopPlayback, playResponse]);

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        data-tutorial="ai-advisor-button"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "bg-gradient-to-br from-primary to-primary/80",
            "hover:from-primary/90 hover:to-primary/70",
            isOpen && "hidden"
          )}
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Financial Advisor</h3>
                    {isPro && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                        <Brain className="w-3 h-3" />
                        Memory
                      </span>
                    )}
                    {isUsingFallback && voiceMode && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                        <WifiOff className="w-3 h-3" />
                        Browser voice
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {voiceMode 
                      ? (sttProvider === 'webspeech' ? 'Click mic to speak' : 'Voice mode')
                      : isPro ? 'Personalized AI guidance' : 'AI-powered guidance'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Voice/Text Toggle */}
                <Button
                  variant={!voiceMode ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setVoiceMode(false)}
                  title="Text mode"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant={voiceMode ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setVoiceMode(true)}
                  title="Voice mode"
                  disabled={!isWebSpeechSTTSupported && sttProvider !== 'elevenlabs'}
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      {voiceMode ? (
                        <Mic className="w-6 h-6 text-primary" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <h4 className="font-medium">
                      {voiceMode ? 'Voice Assistant Ready' : 'How can I help you today?'}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {voiceMode 
                        ? 'Hold the mic button and speak commands like "Add $500 to my savings"'
                        : 'Ask me about budgeting, investing, or debt management'
                      }
                    </p>
                  </div>
                  {!voiceMode && (
                    <div className="space-y-2">
                      {SUGGESTED_QUESTIONS.map((question, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(question)}
                          className="w-full text-left p-3 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' && "flex-row-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : message.isAction
                            ? "bg-green-500/20 text-green-500"
                            : "bg-muted"
                        )}
                      >
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "flex-1 rounded-lg p-3 text-sm",
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : message.isAction
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-muted"
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="flex items-start justify-between gap-2">
                            <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => handlePlayMessage(message.content, i)}
                            >
                              {isPlaying && playingMessageId === i ? (
                                <VolumeX className="w-3 h-3" />
                              ) : (
                                <Volume2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Pending Action Confirmation */}
                  {pendingAction && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Confirm Action</p>
                          <p className="text-sm text-muted-foreground">
                            This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={handleConfirmAction}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, delete'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelAction}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {isLoading && messages[messages.length - 1]?.role === 'user' && !pendingAction && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              {voiceMode ? (
                sttProvider === 'webspeech' ? (
                  // Web Speech API mode: Click to start recognition
                  <Button
                    className="w-full h-12 transition-all"
                    onClick={handleMicPress}
                    disabled={isLoading || isRecording}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isRecording ? (
                      <>
                        <Mic className="w-5 h-5 mr-2 animate-pulse text-destructive" />
                        Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        Click to speak
                      </>
                    )}
                  </Button>
                ) : (
                  // ElevenLabs mode: Hold to record
                  <Button
                    className={cn(
                      "w-full h-12 transition-all",
                      isRecording && "bg-destructive hover:bg-destructive/90"
                    )}
                    onMouseDown={handleMicPress}
                    onMouseUp={handleMicRelease}
                    onMouseLeave={handleMicRelease}
                    onTouchStart={handleMicPress}
                    onTouchEnd={handleMicRelease}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isRecording ? (
                      <>
                        <MicOff className="w-5 h-5 mr-2 animate-pulse" />
                        Listening... Release to send
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        Hold to speak
                      </>
                    )}
                  </Button>
                )
              ) : (
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about finances..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
