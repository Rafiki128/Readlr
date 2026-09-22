import { useEffect, useRef } from 'react';

// Global audio manager to prevent overlapping audio across the entire app
let globalAudioRef: HTMLAudioElement | null = null;
let globalSynthesis: SpeechSynthesisUtterance | null = null;

export const stopAllGlobalAudio = () => {
  try {
    // Stop HTML5 audio
    if (globalAudioRef) {
      globalAudioRef.onended = null;
      globalAudioRef.onerror = null;
      globalAudioRef.pause();
      globalAudioRef.currentTime = 0;
      globalAudioRef.src = ''; // Clear the src
      globalAudioRef = null;
    }
    
    // Stop speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      globalSynthesis = null;
    }
  } catch (error) {
    console.error('Error stopping audio:', error);
  }
};

export function useAudioManager() {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Stop any currently playing audio
  const stopAudio = () => {
    isPlayingRef.current = false;
    stopAllGlobalAudio();
    
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
        currentAudioRef.current = null;
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  // Play audio - stops any existing audio first
  const playAudio = (audioPath: string) => {
    // Always stop all global audio first
    stopAllGlobalAudio();
    isPlayingRef.current = false;
    
    try {
      const audio = new Audio(audioPath);
      audio.volume = 1.0; // Ensure full volume
      
      globalAudioRef = audio;
      currentAudioRef.current = audio;
      isPlayingRef.current = true;
      
      // Handle errors
      audio.onerror = () => {
        console.log(`Failed to load audio: ${audioPath}`);
        isPlayingRef.current = false;
      };
      
      audio.play().catch((error) => {
        console.log(`Failed to play audio: ${audioPath}`, error);
        isPlayingRef.current = false;
      });

      // Clean up reference when audio ends
      audio.addEventListener('ended', () => {
        isPlayingRef.current = false;
        if (globalAudioRef === audio) {
          globalAudioRef = null;
        }
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
      });

      return audio;
    } catch (error) {
      console.error('Error creating audio:', error);
      isPlayingRef.current = false;
      return null;
    }
  };

  // Play speech synthesis - stops other audio first
  const speakText = (text: string, rate = 1) => {
    // Stop all HTML5 audio first
    stopAllGlobalAudio();
    isPlayingRef.current = false;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      globalSynthesis = utterance;
      
      utterance.onstart = () => {
        isPlayingRef.current = true;
      };
      
      utterance.onend = () => {
        isPlayingRef.current = false;
        if (globalSynthesis === utterance) {
          globalSynthesis = null;
        }
      };

      utterance.onerror = () => {
        isPlayingRef.current = false;
      };
      
      window.speechSynthesis.cancel(); // Cancel any existing speech
      window.speechSynthesis.speak(utterance);
      return utterance;
    } catch (error) {
      console.error('Error with speech synthesis:', error);
      isPlayingRef.current = false;
      return null;
    }
  };

  // Stop audio and cleanup when component unmounts
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Stop audio when page visibility changes (user navigates away or tab switches)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAllGlobalAudio();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    playAudio,
    stopAudio,
    speakText,
    stopAllAudio: stopAllGlobalAudio,
    isPlaying: isPlayingRef.current,
  };
}
