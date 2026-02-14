import { useState, useRef, useCallback, useEffect } from 'react';
import {
  isWebSpeechSTTSupported,
  isWebSpeechTTSSupported,
  startWebSpeechRecognition,
  speakWithWebSpeech,
  stopWebSpeech,
  getWebSpeechSupport,
} from '@/lib/webSpeechApi';

type VoiceProvider = 'elevenlabs' | 'webspeech' | 'none';

interface UseVoiceChatOptions {
  onTranscription?: (text: string) => void;
  onFallbackActivated?: (provider: VoiceProvider) => void;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [sttProvider, setSttProvider] = useState<VoiceProvider>('elevenlabs');
  const [ttsProvider, setTtsProvider] = useState<VoiceProvider>('elevenlabs');
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webSpeechCancelRef = useRef<(() => void) | null>(null);

  // Check Web Speech API support on mount
  useEffect(() => {
    const support = getWebSpeechSupport();
    console.log('[VoiceChat] Browser support:', support);
  }, []);

  const startRecording = useCallback(async () => {
    // If using Web Speech API for STT, don't need MediaRecorder
    if (sttProvider === 'webspeech') {
      setIsRecording(true);
      console.log('[VoiceChat] Web Speech recognition mode - ready to transcribe');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm',
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      console.log('[VoiceChat] Recording started (ElevenLabs mode)');
    } catch (error) {
      console.error('[VoiceChat] Failed to start recording:', error);
      throw error;
    }
  }, [sttProvider]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    // If using Web Speech API, don't return blob
    if (sttProvider === 'webspeech') {
      setIsRecording(false);
      return null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        console.log(`[VoiceChat] Recording stopped: ${audioBlob.size} bytes`);
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, [sttProvider]);

  const transcribeWithElevenLabs = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`,
      {
        method: 'POST',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `ElevenLabs STT failed: ${response.status}`);
    }

    const { text } = await response.json();
    console.log(`[VoiceChat] ElevenLabs transcription: "${text}"`);
    return text;
  }, []);

  const transcribeWithWebSpeech = useCallback(async (): Promise<string> => {
    if (!isWebSpeechSTTSupported()) {
      throw new Error('Web Speech API not supported in this browser');
    }

    console.log('[VoiceChat] Starting Web Speech recognition...');
    const text = await startWebSpeechRecognition();
    console.log(`[VoiceChat] Web Speech transcription: "${text}"`);
    return text;
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    // If already using Web Speech fallback, use it directly
    if (sttProvider === 'webspeech') {
      return transcribeWithWebSpeech();
    }

    // Try ElevenLabs first
    try {
      return await transcribeWithElevenLabs(audioBlob);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[VoiceChat] ElevenLabs STT failed:', errorMessage);
      
      // Check if it's an auth or quota error
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('detected_unusual_activity') ||
        errorMessage.includes('ElevenLabs API error')
      ) {
        // Try Web Speech fallback
        if (isWebSpeechSTTSupported()) {
          console.log('[VoiceChat] Falling back to Web Speech API for STT');
          setSttProvider('webspeech');
          setIsUsingFallback(true);
          options.onFallbackActivated?.('webspeech');
          
          // For this request, we need the user to speak again since we recorded audio
          // but Web Speech needs live input. Throw a specific error.
          throw new Error('FALLBACK_ACTIVATED');
        } else {
          throw new Error('Voice recognition unavailable. Please type your message.');
        }
      }
      
      throw error;
    }
  }, [sttProvider, transcribeWithElevenLabs, transcribeWithWebSpeech, options]);

  const playWithElevenLabs = useCallback(async (text: string, messageId?: number): Promise<void> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `ElevenLabs TTS failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        setPlayingMessageId(null);
        audioRef.current = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        setPlayingMessageId(null);
        audioRef.current = null;
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }, []);

  const playWithWebSpeech = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isWebSpeechTTSSupported()) {
        reject(new Error('Text-to-speech not supported'));
        return;
      }

      const { cancel } = speakWithWebSpeech(
        text,
        () => {
          setIsPlaying(false);
          setPlayingMessageId(null);
          webSpeechCancelRef.current = null;
          resolve();
        },
        (error) => {
          setIsPlaying(false);
          setPlayingMessageId(null);
          webSpeechCancelRef.current = null;
          reject(new Error(error));
        }
      );

      webSpeechCancelRef.current = cancel;
    });
  }, []);

  const playResponse = useCallback(async (text: string, messageId?: number): Promise<void> => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (webSpeechCancelRef.current) {
      webSpeechCancelRef.current();
      webSpeechCancelRef.current = null;
    }

    setIsPlaying(true);
    if (messageId !== undefined) {
      setPlayingMessageId(messageId);
    }

    // If already using Web Speech fallback, use it directly
    if (ttsProvider === 'webspeech') {
      try {
        await playWithWebSpeech(text);
        console.log('[VoiceChat] Web Speech TTS completed');
      } catch (error) {
        console.error('[VoiceChat] Web Speech TTS error:', error);
        setIsPlaying(false);
        setPlayingMessageId(null);
        throw error;
      }
      return;
    }

    // Try ElevenLabs first
    try {
      await playWithElevenLabs(text, messageId);
      console.log('[VoiceChat] ElevenLabs TTS completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[VoiceChat] ElevenLabs TTS failed:', errorMessage);
      
      // Check if it's an auth or quota error
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('ElevenLabs API error')
      ) {
        // Try Web Speech fallback
        if (isWebSpeechTTSSupported()) {
          console.log('[VoiceChat] Falling back to Web Speech API for TTS');
          setTtsProvider('webspeech');
          setIsUsingFallback(true);
          options.onFallbackActivated?.('webspeech');
          
          try {
            await playWithWebSpeech(text);
            console.log('[VoiceChat] Web Speech TTS completed (fallback)');
          } catch (wsError) {
            setIsPlaying(false);
            setPlayingMessageId(null);
            throw wsError;
          }
          return;
        }
      }
      
      setIsPlaying(false);
      setPlayingMessageId(null);
      throw error;
    }
  }, [ttsProvider, playWithElevenLabs, playWithWebSpeech, options]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (webSpeechCancelRef.current) {
      webSpeechCancelRef.current();
      webSpeechCancelRef.current = null;
    }
    stopWebSpeech();
    setIsPlaying(false);
    setPlayingMessageId(null);
  }, []);

  const parseVoiceCommand = useCallback(async (text: string, addressBook?: Array<{ name: string; wallet_address?: string | null }>): Promise<{
    action: string;
    data: Record<string, any>;
  }> => {
    const body: Record<string, any> = { text };
    if (addressBook && addressBook.length > 0) {
      body.addressBook = addressBook;
    }
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-voice-command`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to parse voice command');
    }

    return response.json();
  }, []);

  // New method for Web Speech-based recording (real-time transcription)
  const startWebSpeechRecording = useCallback(async (): Promise<string> => {
    if (!isWebSpeechSTTSupported()) {
      throw new Error('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
    }

    setIsRecording(true);
    
    try {
      const text = await startWebSpeechRecognition();
      return text;
    } finally {
      setIsRecording(false);
    }
  }, []);

  return {
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
    // New properties for fallback support
    sttProvider,
    ttsProvider,
    isUsingFallback,
    startWebSpeechRecording,
    isWebSpeechSTTSupported: isWebSpeechSTTSupported(),
    isWebSpeechTTSSupported: isWebSpeechTTSSupported(),
  };
}
