const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const TYPES = ["posture", "walk", "hydration"];

let settings = {
  posture: { enabled: true, intervalMinutes: 20 },
  walk: { enabled: false, intervalMinutes: 45 },
  hydration: { enabled: false, intervalMinutes: 30 },
  sound: "gentle-bell",
  volume: 0.7,
  showNotification: true,
  lang: "en",
  customSounds: []
};

// ── Load ──
async function loadSettings() {
  const stored = await chrome.storage.local.get("settings");
  if (stored.settings) settings = { ...settings, ...stored.settings };
  applyToUI();
  applyLanguage();
}

function applyToUI() {
  TYPES.forEach(type => {
    const s = settings[type];
    $(`#toggle-${type}`).checked = s.enabled;
    $(`#interval-${type}`).value = s.intervalMinutes;
    updateIntervalLabel(type);
    $(`#card-${type}`).classList.toggle("disabled", !s.enabled);
    updateStatus(type);
  });

  $("#toggle-notifications").checked = settings.showNotification;

  $$(".sound-option").forEach(el => {
    el.classList.toggle("selected", el.dataset.sound === settings.sound);
  });

  $("#volumeSlider").value = settings.volume;
  $("#volumePct").textContent = `${Math.round(settings.volume * 100)}%`;

  // Language buttons
  $$(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === settings.lang);
  });

  renderCustomSounds();
}

function updateIntervalLabel(type) {
  const val = settings[type].intervalMinutes;
  const t = I18N[settings.lang] || I18N.en;
  $(`#intervalLabel-${type}`).textContent = `${val} ${t.min}`;
}

function updateStatus(type) {
  const t = I18N[settings.lang] || I18N.en;
  const el = $(`#status-${type}`);
  const on = settings[type].enabled;
  el.textContent = on ? t.on : t.off;
  el.className = `card-status ${on ? "on" : "off"}`;
}

function applyLanguage() {
  const t = I18N[settings.lang] || I18N.en;

  // Brand
  if (settings.lang === "ko") {
    $("#brandName").textContent = "잔소리";
    $("#brandHangul").textContent = "Jansori";
  } else {
    $("#brandName").textContent = "Jansori";
    $("#brandHangul").textContent = "잔소리";
  }
  $("#tagline").textContent = t.appTagline;

  // All data-i18n elements
  $$("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });

  // Status badges
  TYPES.forEach(type => updateStatus(type));

  // Interval labels
  TYPES.forEach(type => updateIntervalLabel(type));
}

function renderCustomSounds() {
  const container = $("#customSoundsList");
  container.innerHTML = "";
  (settings.customSounds || []).forEach(cs => {
    const div = document.createElement("div");
    div.className = `custom-sound${settings.sound === cs.id ? " selected" : ""}`;
    div.innerHTML = `
      <span class="sound-icon">🎧</span>
      <span>${cs.name}</span>
      <button class="remove-btn" data-id="${cs.id}" title="Remove">✕</button>
    `;
    div.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-btn")) return;
      settings.sound = cs.id;
      saveSettings();
    });
    div.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      settings.customSounds = settings.customSounds.filter(s => s.id !== cs.id);
      if (settings.sound === cs.id) settings.sound = "gentle-bell";
      saveSettings();
    });
    container.appendChild(div);
  });
}

async function saveSettings() {
  await chrome.storage.local.set({ settings });
  chrome.runtime.sendMessage({ action: "updateSettings", settings });
  applyToUI();
  applyLanguage();
}

// ── Event listeners ──

// Reminder toggles & sliders
TYPES.forEach(type => {
  $(`#toggle-${type}`).addEventListener("change", () => {
    settings[type].enabled = $(`#toggle-${type}`).checked;
    saveSettings();
  });
  $(`#interval-${type}`).addEventListener("input", () => {
    settings[type].intervalMinutes = parseInt($(`#interval-${type}`).value);
    updateIntervalLabel(type);
  });
  $(`#interval-${type}`).addEventListener("change", () => saveSettings());
});

// Notifications
$("#toggle-notifications").addEventListener("change", () => {
  settings.showNotification = $("#toggle-notifications").checked;
  saveSettings();
});

// Sound selection
$$(".sound-option").forEach(el => {
  el.addEventListener("click", () => {
    settings.sound = el.dataset.sound;
    saveSettings();
  });
});

// Volume
$("#volumeSlider").addEventListener("input", () => {
  settings.volume = parseFloat($("#volumeSlider").value);
  $("#volumePct").textContent = `${Math.round(settings.volume * 100)}%`;
});
$("#volumeSlider").addEventListener("change", () => saveSettings());

// Test buttons
$("#testSoundBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({
    action: "testSound",
    sound: settings.sound,
    volume: settings.volume,
    customSounds: settings.customSounds
  });
});

$("#testNotifBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({
    action: "testNotification",
    type: "posture",
    settings
  });
});

// Language
$$(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    settings.lang = btn.dataset.lang;
    saveSettings();
  });
});

// Upload
$("#uploadBtn").addEventListener("click", () => $("#fileInput").click());

$("#fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const t = I18N[settings.lang] || I18N.en;
  if (file.size > 1024 * 1024) {
    alert(t.fileTooLarge);
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const id = "custom-" + Date.now();
    const name = file.name.replace(/\.[^.]+$/, "");
    if (!settings.customSounds) settings.customSounds = [];
    settings.customSounds.push({
      id,
      name: name.length > 20 ? name.substring(0, 20) + "…" : name,
      dataUrl: reader.result
    });
    settings.sound = id;
    await saveSettings();
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});

// Init
loadSettings();
