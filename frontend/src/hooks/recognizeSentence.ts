export async function recognizeSentence(
  audioBlob: Blob,
  targetPhrase: string,
  signal: AbortSignal
): Promise<{ status: 'matched' | 'uncertain'; wordScores: Record<number, 'correct' | 'missed'> }> {
  
  // 1. Package the audio and text into a FormData object
  const formData = new FormData();
  formData.append('audio', audioBlob, 'reading.wav');
  formData.append('sentence', targetPhrase); // Backend controller expects 'sentence' field

  // Retrieve your authentication token using your exact Local Storage key
  const token = localStorage.getItem('auth_token');

  try {
    // 2. Send the request to your Express backend API
    const response = await fetch('http://localhost:3000/api/audio/evaluate-sentence', {
      method: 'POST',
      body: formData,
      signal: signal, // Cancels the request if the user leaves the screen
      headers: {
        // Include the auth token so authMiddleware allows the request through
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      // A friendly message: this text can be shown and read aloud to the learner.
      throw new Error("We could not check that recording. Please try again.");
    }

    // 3. Parse the evaluation returned by your backend
    const result = await response.json();

    return {
      status: result.status,
      wordScores: result.wordScores
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Let the component handle the aborted request naturally
    }
    
    console.error("Backend evaluation failed:", error);
    
    // Fallback if the network drops or the server fails
    return {
      status: 'uncertain',
      wordScores: {} 
    };
  }
}