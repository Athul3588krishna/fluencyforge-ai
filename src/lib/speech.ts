export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export function speakEnglishText(
  text: string,
  options: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
  } = {}
): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    options.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = options.rate ?? 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith('en') && /natural|google|samantha|daniel|karen/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('en'));
  if (preferred) {
    utterance.voice = preferred;
  }

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function createSpeechRecognizer(callbacks: {
  onTranscript: (finalText: string, interimText: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}) {
  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    return null;
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let accumulatedFinal = '';

  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || '';
      if (result.isFinal) {
        accumulatedFinal = `${accumulatedFinal} ${transcript}`.trim();
      } else {
        interim = `${interim} ${transcript}`.trim();
      }
    }
    callbacks.onTranscript(accumulatedFinal, interim);
  };

  recognition.onerror = (event: any) => {
    const code = event?.error || 'unknown';
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      callbacks.onError(
        'Microphone permission was denied. Please allow microphone access in your browser or use the text input below.'
      );
    } else if (code === 'no-speech') {
      callbacks.onError('No speech was detected. Try speaking closer to the microphone or type your answer.');
    } else if (code === 'audio-capture') {
      callbacks.onError('No working microphone was detected. You can continue using text input.');
    } else if (code !== 'aborted') {
      callbacks.onError(`Speech recognition stopped (${code}). You can edit or type your response.`);
    }
  };

  recognition.onend = () => {
    callbacks.onEnd();
  };

  return {
    start: () => {
      accumulatedFinal = '';
      recognition.start();
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore if already stopped
      }
    },
  };
}
