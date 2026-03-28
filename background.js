if (typeof I18N === 'undefined') importScripts('i18n.js');

const HAS_OFFSCREEN = typeof chrome !== 'undefined' && !!chrome.offscreen;

const DEFAULT_SETTINGS = {
  posture: { enabled: true, intervalMinutes: 20 },
  walk: { enabled: false, intervalMinutes: 45 },
  hydration: { enabled: false, intervalMinutes: 30 },
  sound: "gentle-bell",
  volume: 0.7,
  showNotification: true,
  lang: "en",
  customSounds: []
};

const ICONS_EMOJI = { posture: "🪑", walk: "🚶", hydration: "💧" };

function getTitle(type, lang) {
  const t = I18N[lang] || I18N.en;
  return t[type] || type;
}

function getRandomMessage(type, lang) {
  const t = I18N[lang] || I18N.en;
  const msgs = t.messages[type];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function startAlarm(type, intervalMinutes) {
  const name = `reminder-${type}`;
  chrome.alarms.clear(name, () => {
    chrome.alarms.create(name, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes
    });
  });
}

function stopAlarm(type) {
  chrome.alarms.clear(`reminder-${type}`);
}

function syncAlarms(settings) {
  for (const type of ["posture", "walk", "hydration"]) {
    if (settings[type]?.enabled) {
      startAlarm(type, settings[type].intervalMinutes);
    } else {
      stopAlarm(type);
    }
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get("settings");
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  syncAlarms(stored.settings || DEFAULT_SETTINGS);
});

chrome.runtime.onStartup.addListener(async () => {
  const { settings } = await chrome.storage.local.get("settings");
  if (settings) syncAlarms(settings);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("reminder-")) return;
  const type = alarm.name.replace("reminder-", "");
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings?.[type]?.enabled) return;

  if (settings.showNotification) {
    const message = getRandomMessage(type, settings.lang);
    const title = `${ICONS_EMOJI[type]} ${getTitle(type, settings.lang)}`;
    chrome.notifications.create(`${type}-${Date.now()}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message,
      priority: 1
    });
  }

  await playSound(settings.sound, settings.volume, settings.customSounds);
});

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play reminder sound"
    });
  }
}

async function playSound(soundId, volume, customSounds = []) {
  try {
    let soundUrl;
    const custom = customSounds.find(s => s.id === soundId);
    soundUrl = custom ? custom.dataUrl : `sounds/${soundId}.mp3`;

    if (HAS_OFFSCREEN) {
      await ensureOffscreenDocument();
      chrome.runtime.sendMessage({ action: "playSound", soundUrl, volume });
    } else {
      const audio = new Audio(soundUrl);
      audio.volume = volume || 0.7;
      audio.play().catch(err => console.warn("Audio play failed:", err));
    }
  } catch (err) {
    console.warn("Sound playback error:", err);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateSettings") {
    syncAlarms(message.settings);
  }
  if (message.action === "testSound") {
    playSound(message.sound, message.volume, message.customSounds || []);
  }
  if (message.action === "testNotification") {
    const { settings } = message;
    const type = message.type || "posture";
    const lang = settings?.lang || "en";
    const msg = getRandomMessage(type, lang);
    const title = `${ICONS_EMOJI[type]} ${getTitle(type, lang)}`;
    chrome.notifications.create(`test-${Date.now()}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message: msg,
      priority: 1
    });
  }
});
