import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const contentType = req.headers.get('content-type') || '';
    
    let audioFile: File;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      audioFile = formData.get('audio') as File;
    } else {
      // Handle raw audio blob
      const audioBlob = await req.blob();
      audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' });
    }

    if (!audioFile) {
      throw new Error('Audio file is required');
    }

    console.log(`[STT] Processing audio file: ${audioFile.size} bytes, type: ${audioFile.type}`);

    const apiFormData = new FormData();
    apiFormData.append('file', audioFile);
    apiFormData.append('model_id', 'scribe_v2');
    apiFormData.append('language_code', 'eng');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[STT] ElevenLabs API error: ${response.status} - ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[STT] Transcription result: "${result.text?.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ text: result.text || '' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[STT] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
