chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "playSound") {
    const audio = new Audio(message.soundUrl);
    audio.volume = message.volume || 0.7;
    audio.play().catch(err => console.warn("Audio play failed:", err));
  }
});
