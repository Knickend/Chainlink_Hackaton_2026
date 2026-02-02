import { useState, useRef, useCallback } from 'react';

interface UseVoiceChatOptions {
  onTranscription?: (text: string) => void;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
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
      
      console.log('[VoiceChat] Recording started');
    } catch (error) {
      console.error('[VoiceChat] Failed to start recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
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
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
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
      throw new Error(error.error || 'Transcription failed');
    }

    const { text } = await response.json();
    console.log(`[VoiceChat] Transcription: "${text}"`);
    return text;
  }, []);

  const playResponse = useCallback(async (text: string, messageId?: number): Promise<void> => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsPlaying(true);
    if (messageId !== undefined) {
      setPlayingMessageId(messageId);
    }

    try {
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
        throw new Error(error.error || 'TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        setPlayingMessageId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        setPlayingMessageId(null);
        audioRef.current = null;
      };

      await audio.play();
      console.log('[VoiceChat] Playing audio response');
    } catch (error) {
      console.error('[VoiceChat] Playback error:', error);
      setIsPlaying(false);
      setPlayingMessageId(null);
      throw error;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setPlayingMessageId(null);
  }, []);

  const parseVoiceCommand = useCallback(async (text: string): Promise<{
    action: string;
    data: Record<string, any>;
  }> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-voice-command`,
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
      throw new Error('Failed to parse voice command');
    }

    return response.json();
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
  };
}
