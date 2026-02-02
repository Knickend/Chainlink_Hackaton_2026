/**
 * Web Speech API utilities for fallback speech recognition and synthesis.
 * Used when ElevenLabs API is unavailable or fails.
 */

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

/**
 * Check if Web Speech API speech recognition is supported
 */
export function isWebSpeechSTTSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Check if Web Speech API speech synthesis is supported
 */
export function isWebSpeechTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Get browser support info for user feedback
 */
export function getWebSpeechSupport(): {
  stt: boolean;
  tts: boolean;
  browserName: string;
} {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  
  if (ua.includes('Firefox')) {
    browserName = 'Firefox';
  } else if (ua.includes('Chrome')) {
    browserName = 'Chrome';
  } else if (ua.includes('Safari')) {
    browserName = 'Safari';
  } else if (ua.includes('Edge')) {
    browserName = 'Edge';
  }
  
  return {
    stt: isWebSpeechSTTSupported(),
    tts: isWebSpeechTTSSupported(),
    browserName,
  };
}

/**
 * Create a speech recognition instance
 */
export function createSpeechRecognition(): SpeechRecognition | null {
  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognitionConstructor) {
    return null;
  }
  
  const recognition = new SpeechRecognitionConstructor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  return recognition;
}

/**
 * Start listening for speech and return a promise with the transcribed text
 */
export function startWebSpeechRecognition(
  onInterimResult?: (text: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const recognition = createSpeechRecognition();
    
    if (!recognition) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }

    let finalTranscript = '';
    let hasResult = false;

    recognition.onstart = () => {
      console.log('[WebSpeech] Recognition started');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          hasResult = true;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (onInterimResult && interimTranscript) {
        onInterimResult(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[WebSpeech] Recognition error:', event.error);
      
      // Map error codes to user-friendly messages
      let errorMessage = 'Speech recognition failed';
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please connect a microphone.';
          break;
        case 'aborted':
          // User aborted, not an error
          if (hasResult && finalTranscript) {
            resolve(finalTranscript.trim());
            return;
          }
          break;
      }
      
      reject(new Error(errorMessage));
    };

    recognition.onend = () => {
      console.log('[WebSpeech] Recognition ended');
      if (hasResult && finalTranscript) {
        resolve(finalTranscript.trim());
      } else if (!hasResult) {
        reject(new Error('No speech detected'));
      }
    };

    try {
      recognition.start();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a managed speech recognition session that can be stopped
 */
export function createManagedRecognition(
  onResult: (text: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void
): {
  start: () => void;
  stop: () => void;
  isSupported: boolean;
} {
  const recognition = createSpeechRecognition();
  
  if (!recognition) {
    return {
      start: () => onError('Speech recognition not supported'),
      stop: () => {},
      isSupported: false,
    };
  }

  let finalTranscript = '';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
        onResult(finalTranscript, true);
      } else {
        interimTranscript += result[0].transcript;
        onResult(finalTranscript + interimTranscript, false);
      }
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error !== 'aborted') {
      onError(event.error || 'Recognition failed');
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  return {
    start: () => {
      finalTranscript = '';
      try {
        recognition.start();
      } catch {
        // Already started, ignore
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // Already stopped, ignore
      }
    },
    isSupported: true,
  };
}

/**
 * Get the best available voice for TTS
 */
export function getBestVoice(): SpeechSynthesisVoice | null {
  if (!isWebSpeechTTSSupported()) {
    return null;
  }

  const voices = speechSynthesis.getVoices();
  
  if (voices.length === 0) {
    return null;
  }

  // Priority: English voices, preferring natural-sounding ones
  const preferredVoices = [
    // Premium/natural voices (often have "Premium" or "Enhanced" in name)
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('premium'),
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('enhanced'),
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural'),
    // Google voices (generally good quality)
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('google'),
    // Microsoft voices
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('microsoft'),
    // Any local English voice (not remote)
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.localService,
    // Any English voice
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
    // Default voice
    (v: SpeechSynthesisVoice) => v.default,
  ];

  for (const predicate of preferredVoices) {
    const voice = voices.find(predicate);
    if (voice) {
      return voice;
    }
  }

  return voices[0];
}

/**
 * Speak text using Web Speech API
 */
export function speakWithWebSpeech(
  text: string,
  onEnd?: () => void,
  onError?: (error: string) => void
): {
  cancel: () => void;
} {
  if (!isWebSpeechTTSSupported()) {
    onError?.('Text-to-speech not supported');
    return { cancel: () => {} };
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice
  const voice = getBestVoice();
  if (voice) {
    utterance.voice = voice;
  }
  
  // Settings for natural speech
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onend = () => {
    console.log('[WebSpeech] TTS completed');
    onEnd?.();
  };

  utterance.onerror = (event) => {
    console.error('[WebSpeech] TTS error:', event.error);
    onError?.(event.error || 'Speech synthesis failed');
  };

  // Chrome bug: voices may not be loaded yet
  // Wait for voices to load if needed
  const speak = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      const bestVoice = getBestVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      speechSynthesis.speak(utterance);
    } else {
      // Voices not loaded yet, try again
      setTimeout(speak, 50);
    }
  };

  speak();

  return {
    cancel: () => {
      speechSynthesis.cancel();
    },
  };
}

/**
 * Promise-based speak function
 */
export function speakWithWebSpeechAsync(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    speakWithWebSpeech(
      text,
      () => resolve(),
      (error) => reject(new Error(error))
    );
  });
}

/**
 * Stop any ongoing speech
 */
export function stopWebSpeech(): void {
  if (isWebSpeechTTSSupported()) {
    speechSynthesis.cancel();
  }
}
