---
author: Tristan Madden
categories: [JavaScript]
date: 2025-03-11
draft: false
tags: [Genesys Cloud]
title: Genesys Cloud Queue Watcher
thumbnail: "thumbnail.png"
summary: "A JavaScript script that monitors waiting calls in Genesys Cloud and plays a Super Mario Bros. theme when a call is waiting."
usePageBundles: true
---

## The Script

Below is a JavaScript script that monitors the "Waiting" column in Genesys Cloud and plays the first few notes of the Super Mario Bros. theme when a call is waiting.

```javascript
let alarmInterval;

function playMarioTune() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  
  function playNote(frequency, startTime, duration) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + startTime);
    gainNode.gain.setValueAtTime(0.5, context.currentTime + startTime);
    
    oscillator.start(context.currentTime + startTime);
    oscillator.stop(context.currentTime + startTime + duration);
  }

  // Notes for the Mario theme (G E C D G E C D)
  const notes = [
    { freq: 784, time: 0.0, dur: 0.15 },  // G5
    { freq: 659, time: 0.2, dur: 0.15 },  // E5
    { freq: 523, time: 0.4, dur: 0.15 },  // C5
    { freq: 587, time: 0.6, dur: 0.15 },  // D5
    { freq: 784, time: 0.9, dur: 0.15 },  // G5
    { freq: 659, time: 1.1, dur: 0.15 },  // E5
    { freq: 523, time: 1.3, dur: 0.15 },  // C5
    { freq: 587, time: 1.5, dur: 0.15 }   // D5
  ];

  notes.forEach(note => playNote(note.freq, note.time, note.dur));
}

function startQueueWatcher() {
  if (alarmInterval) {
    console.log("Queue watcher is already running.");
    return;
  }
  console.log("Queue watcher started.");
  alarmInterval = setInterval(() => {
    console.log('Checking call waiting status...');
    const waitingCells = document.querySelectorAll('.waitingCountBreakdown .total-count');
    waitingCells.forEach(cell => {
      const waitingCount = parseInt(cell.textContent.trim(), 10);
      if (waitingCount > 0) {
        console.log(`Call waiting detected! Count: ${waitingCount}`);
        playMarioTune();
      }
    });
  }, 5000);
}

function stopQueueWatcher() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
    console.log("Queue watcher stopped.");
  } else {
    console.log("No queue watcher is running.");
  }
}
```

## Explanation

### **How It Works**
- The script monitors the "Waiting" column in Genesys Cloud every **5 seconds**.
- If there is a waiting call (`waitingCount > 0`), it plays the first few notes of the **Super Mario Bros.** theme.
- The script provides two functions for control:
  - `startQueueWatcher();` → **Starts the watcher**.
  - `stopQueueWatcher();` → **Stops the watcher**.
- The script logs activity in the console so you can verify it's running.

### **How to Use It**
1. **Enable Developer Tools** in the **Advanced Preferences** of Genesys Cloud.
2. **Open the Chrome Developer Console** (`F12` or `Ctrl+Shift+J`).
3. Type `allow paste` into the Chrome Developer Console and press **Enter**.
4. Copy and paste the script into the console.
5. Run `startQueueWatcher();` to begin monitoring.
6. If you want to stop it, run `stopQueueWatcher();`.