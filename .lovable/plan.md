

# Plan: Add Web Speech API Fallback for Voice Features

## Overview

Add the browser's native Web Speech API as a fallback for speech recognition (STT) and speech synthesis (TTS) when ElevenLabs is unavailable or fails. This will ensure the voice features continue to work even without an active ElevenLabs subscription.

## How It Works

The system will:
1. **Try ElevenLabs first** - Attempt to use the high-quality ElevenLabs API
2. **Detect failures** - Catch 401 errors, quota exceeded, or network issues
3. **Fall back to Web Speech API** - Automatically switch to the browser's native speech capabilities
4. **Show a subtle indicator** - Let users know they're using the fallback (optional toast)

## Changes Required

### 1. Update `useVoiceChat.ts` Hook

Add fallback logic for both STT and TTS:

**Speech-to-Text (STT) Fallback:**
- Use `SpeechRecognition` API (built into Chrome, Edge, Safari)
- Instead of recording and sending audio to ElevenLabs, directly capture speech as text
- Continuous listening with automatic transcription

**Text-to-Speech (TTS) Fallback:**
- Use `SpeechSynthesis` API (built into all modern browsers)
- Select a natural-sounding voice from available system voices
- Convert assistant responses to spoken audio locally

### 2. Create Web Speech Utility Functions

New helper functions to:
- Check browser support for Web Speech API
- Initialize and manage `SpeechRecognition` instance
- Select the best available voice for `SpeechSynthesis`
- Handle browser-specific quirks (Chrome requires HTTPS, Safari has different API)

### 3. Update `FinancialAdvisorChat.tsx`

- Add visual indicator when using fallback mode
- Handle the different flow (Web Speech API transcribes in real-time vs. recording then sending)
- Show warning if browser doesn't support Web Speech API

## User Experience

| Scenario | What Happens |
|----------|--------------|
| ElevenLabs works | High-quality voice with "George" voice |
| ElevenLabs fails | Automatic fallback with browser voice |
| No Web Speech support | Text mode only, with info message |

## Browser Support

| Browser | STT Support | TTS Support |
|---------|-------------|-------------|
| Chrome/Edge | Yes | Yes |
| Safari | Yes | Yes |
| Firefox | No | Yes |
| Mobile Chrome | Yes | Yes |
| Mobile Safari | Yes | Yes |

For Firefox users (no STT), the system will show a message suggesting Chrome or Safari.

## Technical Details

```text
+------------------+     Success     +------------------+
|  User speaks     | --------------> |  ElevenLabs STT  |
+------------------+                 +------------------+
        |                                    |
        | 401/Error                          v
        v                            +------------------+
+------------------+                 |  Transcribed     |
|  Web Speech API  | --------------> |  Text            |
|  (SpeechRecog)   |                 +------------------+
+------------------+                          |
                                              v
                                     +------------------+
                                     |  Parse Command   |
                                     |  (parse-voice-   |
                                     |   command)       |
                                     +------------------+
                                              |
                                              v
                                     +------------------+
                                     |  Execute Action  |
                                     |  or Chat         |
                                     +------------------+
                                              |
                                              v
                                     +------------------+
                                     |  Response Text   |
                                     +------------------+
                                              |
                           +-----------------+-----------------+
                           |                                   |
                           v                                   v
                   +------------------+               +------------------+
                   |  ElevenLabs TTS  |               |  Web Speech TTS  |
                   |  (George voice)  |               |  (System voice)  |
                   +------------------+               +------------------+
                           |                                   |
                           +-----------------+-----------------+
                                             |
                                             v
                                     +------------------+
                                     |  Audio Playback  |
                                     +------------------+
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webSpeechApi.ts` | Create | Utility functions for Web Speech API |
| `src/hooks/useVoiceChat.ts` | Modify | Add fallback logic and state management |
| `src/components/FinancialAdvisorChat.tsx` | Modify | UI updates for fallback indicator |

## Voice Commands Still Supported

All existing voice commands will work identically:
- "Add $5,000 to my savings account"
- "What's my net worth?"
- "Delete my Netflix expense"
- "Add a goal to save $10,000 for a vacation"

The only difference is the voice quality (system voice vs. ElevenLabs premium voice).

