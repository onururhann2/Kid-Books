// Audio utilities for decoding and playing PCM data from Gemini

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000, // Gemini TTS output sample rate
    });
  }
  return audioContext;
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const playAudio = async (base64Audio: string): Promise<void> => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    
    // Since Gemini sends raw PCM (no header), we need to manually decode it
    // Convert 16-bit PCM to Float32
    const dataInt16 = new Int16Array(arrayBuffer);
    const float32Data = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
      float32Data[i] = dataInt16[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    return new Promise((resolve) => {
      source.onended = () => resolve();
    });
  } catch (error) {
    console.error("Error playing audio:", error);
    throw error;
  }
};