// Frontend/JavaScript/HomeLogin.js
const API_BASE_URL = "http://localhost:3000";
const STORAGE_KEY = "rinkbot_chat_log";
const VOICE_STORAGE_KEY = "rinkbot_voice_log";
const WELCOME_TEXT = "¡Hola! Soy Rinkbot 🐯 ¿En qué debemos profundizar hoy?";
const VOICE_CHOICE_KEY = "rinkbot_tts_voice_name";
const CONFIG_ENDPOINT = `${API_BASE_URL}/api/settings`;

document.addEventListener("DOMContentLoaded", () => {
  // ===== Dark mode toggle =====
  const darkToggleBtn = document.getElementById("darkModeToggle");
  const savedTheme = localStorage.getItem("rinkbot_theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  darkToggleBtn?.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
    localStorage.setItem("rinkbot_theme", isDark ? "light" : "dark");
    darkToggleBtn.textContent = isDark ? "🌙" : "☀️";
  });

  // ======================
  //   USUARIO LOGUEADO
  // ======================
  let currentUser = null;
  try {
    const raw = localStorage.getItem("rinkbot_user");
    if (!raw) {
      window.location.href = "login.html";
      return;
    }
    currentUser = JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo usuario de localStorage:", err);
    window.location.href = "login.html";
    return;
  }

  // ======================
  //  DOM: modal avatar
  // ======================
  const avatarImg = document.querySelector(".avatar-btn .avatar");
  const modalUserName = document.getElementById("modalUserName");
  const modalUserEmail = document.getElementById("modalUserEmail");
  const avatarBtn = document.querySelector(".avatar-btn");
  const avatarModal = document.getElementById("avatarModal");
  const deleteChatBtn = document.getElementById("deleteChatBtn");
  const avatarCloseBtns = avatarModal

    ? avatarModal.querySelectorAll("[data-close='true']")
    : [];

  if (currentUser) {
    if (avatarImg && currentUser.avatar_url) avatarImg.src = currentUser.avatar_url;
    if (modalUserName) modalUserName.textContent = currentUser.usuario || "Usuario Rinkbot";
    if (modalUserEmail) modalUserEmail.textContent = currentUser.correo || "sin-correo@serinco.com";
  }

  function openAvatarModal() {
    if (!avatarModal) return;
    avatarModal.classList.add("open");
    avatarModal.setAttribute("aria-hidden", "false");
  }
  function closeAvatarModal() {
    if (!avatarModal) return;
    avatarModal.classList.remove("open");
    avatarModal.setAttribute("aria-hidden", "true");
  }
  avatarBtn?.addEventListener("click", openAvatarModal);
  avatarCloseBtns.forEach((btn) => btn.addEventListener("click", closeAvatarModal));
  avatarModal?.addEventListener("click", (e) => { if (e.target === avatarModal) closeAvatarModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAvatarModal(); });

  // ======================
  //  Secciones centrales
  // ======================
  const welcomeSection = document.getElementById("welcomeSection");
  const optionsSection = document.getElementById("optionsSection");
  const chatSection = document.getElementById("chatSection");
  const voiceSection = document.getElementById("voiceSection");

  const btnHablemos = document.getElementById("btnHablemos");
  const btnIrChat = document.getElementById("btnIrChat");
  const btnIrHablar = document.getElementById("btnIrHablar");

  // ======================
  //  rails
  // ======================
  const btnRinko = document.getElementById("btnRinko");
  const btnInicio = document.querySelector('.left-nav .icon-btn[data-panel="inicio"]');
  const btnTiempo = document.querySelector('.left-nav .icon-btn[data-panel="tiempo"]');
  const btnFavoritos = document.querySelector('.left-nav .icon-btn[data-panel="favoritos"]');
  const btnAjustes = document.querySelector('.left-nav .icon-btn[data-panel="ajustes"]');
  const btnSalir = document.querySelector('.left-bottom .icon-btn[data-panel="salir"]');

  // ======================
  //  paneles
  // ======================
  const slidePanels = document.querySelectorAll("#slide-panels .slide-panel");
  const closePanelBtns = document.querySelectorAll("#slide-panels .close-panel");

  const ajustesModelEl = document.getElementById("modelName");
  const voiceSelectEl = document.getElementById("voiceSelect");

  // ======================
  //  chat TEXTO
  // ======================
  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const newChatBtn = document.getElementById("newChatBtn");
  const saveChatBtn = document.getElementById("saveChatBtn");
  const chatTitle = document.querySelector(".chat-section .chat-title");
  const chatSurface = document.querySelector(".chat-surface");

  // ======================
  //  chat VOZ
  // ======================
  const voiceMessagesEl = document.getElementById("voiceMessages");
  const recordBtn = document.getElementById("recordBtn");
  const voiceHintEl = document.getElementById("voiceHint");
  const voiceNewChatBtn = document.getElementById("voiceNewChatBtn");
  const voiceSaveChatBtn = document.getElementById("voiceSaveChatBtn");

  // ======================
  //  helper: textarea resize
  // ======================
  function autoResizeTextarea(el) {
    const maxHeight = 140;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  // ======================
  //  Local history (fallback/UX)
  // ======================
  function loadHistory() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveHistory(log) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  }

  function loadVoiceHistory() {
    const raw = localStorage.getItem(VOICE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveVoiceHistory(log) {
    localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(log));
  }

  // ======================
  //  navegación central
  // ======================
  function showOnly(sectionName) {
    const map = { welcome: welcomeSection, options: optionsSection, chat: chatSection, voice: voiceSection };
    Object.entries(map).forEach(([name, el]) => {
      if (!el) return;
      el.classList.toggle("hidden", name !== sectionName);
    });
  }
  function goToWelcome() { showOnly("welcome"); }
  function goToOptions() { showOnly("options"); }
  function goToChat() { showOnly("chat"); initChatIfNeeded(); }
  function goToVoice() { showOnly("voice"); renderVoiceLog(); }

  btnRinko?.addEventListener("click", goToWelcome);
  btnHablemos?.addEventListener("click", () => showOnly("options"));
  btnInicio?.addEventListener("click", goToOptions);

  // reloj -> historial general
  btnTiempo?.addEventListener("click", () => {
    openSlidePanel("mensajes");
    initMensajesPanel({ onlyFavs: false });
  });

  // estrella -> favoritos
  btnFavoritos?.addEventListener("click", () => {
    openSlidePanel("mensajes");
    initMensajesPanel({ onlyFavs: true });
  });

  btnSalir?.addEventListener("click", () => {
    localStorage.removeItem("rinkbot_user");
    window.location.href = "login.html";
  });

  btnIrChat?.addEventListener("click", goToChat);
  btnIrHablar?.addEventListener("click", goToVoice);

  // ======================
  //  slide panels
  // ======================
  function openSlidePanel(name) {
    slidePanels.forEach((panel) => {
      const isTarget = panel.dataset.panel === name;
      panel.classList.toggle("open", isTarget);
      panel.setAttribute("aria-hidden", isTarget ? "false" : "true");
    });
  }

  closePanelBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.closest(".slide-panel");
      if (panel) {
        panel.classList.remove("open");
        panel.setAttribute("aria-hidden", "true");
      }
    });
  });

  // Botones del rail derecho
  document.querySelectorAll('.right-nav .icon-btn[data-panel]').forEach((btn) => {
    const name = btn.dataset.panel;
    btn.addEventListener("click", () => {
      openSlidePanel(name);
      if (name === "mensajes") initMensajesPanel({ onlyFavs: false });
    });
  });

  // HSEQ
  document.querySelectorAll('.hseq-btn[data-panel]').forEach((btn) => {
    const name = btn.dataset.panel;
    btn.addEventListener("click", () => openSlidePanel(name));
  });

  // Ajustes
  let configLoaded = false;
  async function loadServerConfig() {
    if (!ajustesModelEl || configLoaded) return;
    try {
      const res = await fetch(CONFIG_ENDPOINT);
      if (!res.ok) throw new Error("Respuesta no OK");
      const data = await res.json();
      ajustesModelEl.textContent = data.model || "Desconocido";
      configLoaded = true;
    } catch (err) {
      console.error("Error cargando /api/settings:", err);
      ajustesModelEl.textContent = "No disponible";
    }
  }

  btnAjustes?.addEventListener("click", () => {
    openSlidePanel("ajustes");
    loadServerConfig();
    populateVoices();
  });

  // ======================
  //  RENDER CHAT TEXTO
  // ======================
  function appendMessage(role, text) {
    const row = document.createElement("div");
    row.className = `msg-row ${role}`;

    const bubble = document.createElement("div");
    bubble.className = `bubble ${role}`;
    bubble.textContent = text;

    const avatar = document.createElement("img");
    avatar.className = "chat-avatar";

    if (role === "user") {
      avatar.src = currentUser?.avatar_url || "../Assets/Avatar.png";
      avatar.alt = "Usuario";
      row.appendChild(bubble);
      row.appendChild(avatar);
    } else {
      avatar.src = "../Assets/Rinko.png";
      avatar.alt = "Rinkbot";
      row.appendChild(avatar);
      row.appendChild(bubble);
    }

    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderLog(log) {
    messagesEl.innerHTML = "";
    log.forEach((m) => appendMessage(m.role, m.text));
  }

  function botTyping(on) {
    if (on) {
      const row = document.createElement("div");
      row.id = "typing";
      row.className = "msg-row bot";

      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = "../Assets/Rinko.png";
      avatar.alt = "Rinkbot";

      const bubble = document.createElement("div");
      bubble.className = "bubble bot";

      const dots = document.createElement("div");
      dots.className = "typing-dots";
      dots.innerHTML = "<span></span><span></span><span></span>";
      bubble.appendChild(dots);

      row.appendChild(avatar);
      row.appendChild(bubble);
      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else {
      document.getElementById("typing")?.remove();
    }
  }

  // ======================
  //  ENVÍO (TEXTO)
  // ======================
  async function sendUserMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    let log = loadHistory();

    if (!log || log.length === 0) {
      const welcomeMsg = { role: "bot", text: WELCOME_TEXT, ts: Date.now() };
      log = [welcomeMsg];
      saveHistory(log);
      appendMessage("bot", WELCOME_TEXT);
      if (chatTitle) chatTitle.classList.add("hidden");
      if (chatSurface) chatSurface.classList.add("expanded");
    }

    const userMsg = { role: "user", text, ts: Date.now() };
    log.push(userMsg);
    saveHistory(log);
    appendMessage("user", text);
    inputEl.value = "";
    botTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          id_persona: currentUser.id_persona,
          tipo_chat: "texto",
          save: false
        }),
      });

      if (!response.ok) throw new Error("Respuesta no OK del backend");

      const data = await response.json();
      const botText = data.reply || "Hubo un problema al obtener la respuesta.";

      const botMsg = { role: "bot", text: botText, ts: Date.now() };
      const newLog = loadHistory();
      newLog.push(botMsg);
      saveHistory(newLog);
      appendMessage("bot", botText);
    } catch (err) {
      console.error("Error llamando al backend:", err);
      const errorText = "⚠️ Ocurrió un error al conectar con Rinkbot. Intenta de nuevo.";
      const botMsg = { role: "bot", text: errorText, ts: Date.now() };
      const newLog = loadHistory();
      newLog.push(botMsg);
      saveHistory(newLog);
      appendMessage("bot", errorText);
    } finally {
      botTyping(false);
    }
  }

  function resetChat() {
    if (typeof stopAllTTS === "function") stopAllTTS();
    saveHistory([]);
    messagesEl.innerHTML = "";
    if (chatTitle) chatTitle.classList.remove("hidden");
    if (chatSurface) chatSurface.classList.remove("expanded");
  }

  function downloadJsonFile(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  function initChatIfNeeded() {
    const log = loadHistory();
    renderLog(log);
    if (log && log.length > 0) {
      if (chatTitle) chatTitle.classList.add("hidden");
      if (chatSurface) chatSurface.classList.add("expanded");
    } else {
      if (chatTitle) chatTitle.classList.remove("hidden");
      if (chatSurface) chatSurface.classList.remove("expanded");
    }
  }

  // ======================
  // ✅ GUARDAR CHAT COMPLETO EN BD
  // ======================
  async function saveFullChatToBackend(tipo) {
    try {
      if (!currentUser?.id_persona) {
        alert("No se encontró un usuario válido para guardar el chat.");
        return;
      }

      const log = (tipo === "texto") ? loadHistory() : loadVoiceHistory();
      if (!log?.length) {
        alert("No hay mensajes para guardar.");
        return;
      }

      const firstUser = log.find((m) => m.role === "user");
      const titulo = firstUser?.text
        ? firstUser.text.slice(0, 90)
        : (tipo === "texto" ? "Chat de texto con Rinkbot" : "Chat de voz con Rinkbot");

      const payload = {
        id_persona: currentUser.id_persona,
        tipo_chat: tipo, // "texto" | "voz"
        titulo,
        modelo_llm: null,
        chat_json: {
          type: tipo,
          log,
          createdAt: new Date().toISOString(),
        },
        favorito: false,
      };

      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error guardando chat:", errData);
        alert("No se pudo guardar el chat en la base de datos.");
        return;
      }

      // respaldo local opcional
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJsonFile(`rinkbot_${tipo}_chat_${ts}.json`, payload.chat_json);

      alert("✅ Chat guardado correctamente.");
    } catch (err) {
      console.error("Error general al guardar chat:", err);
      alert("Ocurrió un error al guardar el chat.");
    }
  }

  async function deleteChat(idChat) {
    try {
      if (!currentUser?.id_persona) return;

      const url = new URL(`${API_BASE_URL}/api/chats/${idChat}`);
      url.searchParams.set("id_persona", String(currentUser.id_persona));

      const res = await fetch(url.toString(), { method: "DELETE" });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Error borrando chat:", err);
        alert("No se pudo eliminar el chat.");
        return;
      }

      // vuelve a lista y refresca
      showChatListView();
      await loadChatsList({ onlyFavs: onlyFavChatsEl?.checked || false });
    } catch (e) {
      console.error("Error borrando chat:", e);
      alert("Error borrando chat.");
    }
  }


  // ======================
  // LISTENERS CHAT TEXTO
  // ======================
  sendBtn?.addEventListener("click", sendUserMessage);

  if (inputEl) {
    inputEl.addEventListener("input", () => autoResizeTextarea(inputEl));
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
        inputEl.style.height = "46px";
        inputEl.style.overflowY = "hidden";
      }
    });
  }

  newChatBtn?.addEventListener("click", resetChat);
  saveChatBtn?.addEventListener("click", () => saveFullChatToBackend("texto"));

  // ==========================
  //      CHAT DE VOZ (TU CÓDIGO)
  // ==========================
  function estimateDurationFromText(t = "") {
    const words = t.trim() ? t.trim().split(/\s+/).length : 1;
    const sec = words * 0.55;
    return Math.max(2, Math.round(sec));
  }
  function formatTime(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function createVoiceRow(msg) {
    const row = document.createElement("div");
    row.className = `voice-row ${msg.role}`;
    row.dataset.id = msg.id;

    const avatar = document.createElement("img");
    avatar.className = "chat-avatar";
    if (msg.role === "user") {
      avatar.src = currentUser?.avatar_url || "../Assets/Avatar.png";
      avatar.alt = "Usuario";
    } else {
      avatar.src = "../Assets/Rinko.png";
      avatar.alt = "Rinkbot";
    }

    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = `voice-bubble ${msg.role}`;
    bubble.dataset.id = msg.id;

    const iconSpan = document.createElement("span");
    iconSpan.className = "voice-icon";
    iconSpan.textContent = "▶";

    const labelSpan = document.createElement("span");
    labelSpan.className = "voice-label";
    labelSpan.textContent = "Mensaje de voz";

    const timeSpan = document.createElement("span");
    timeSpan.className = "voice-time";

    const currentSpan = document.createElement("span");
    currentSpan.className = "voice-current";
    currentSpan.textContent = "0:00";

    const totalSpan = document.createElement("span");
    totalSpan.className = "voice-total";
    const total = msg.estDurationSec || estimateDurationFromText(msg.transcript || "");
    totalSpan.textContent = formatTime(total);

    timeSpan.appendChild(currentSpan);
    timeSpan.appendChild(document.createTextNode(" / "));
    timeSpan.appendChild(totalSpan);

    bubble.appendChild(iconSpan);
    bubble.appendChild(labelSpan);
    bubble.appendChild(timeSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "voice-delete";
    deleteBtn.dataset.id = msg.id;
    deleteBtn.textContent = "🗑️";

    if (msg.role === "user") {
      row.appendChild(bubble);
      row.appendChild(avatar);
      row.appendChild(deleteBtn);
    } else {
      row.appendChild(avatar);
      row.appendChild(bubble);
      row.appendChild(deleteBtn);
    }

    return row;
  }

  function renderVoiceLog() {
    const log = loadVoiceHistory();
    voiceMessagesEl.innerHTML = "";
    log.forEach((msg) => voiceMessagesEl.appendChild(createVoiceRow(msg)));
    voiceMessagesEl.scrollTop = voiceMessagesEl.scrollHeight;
  }

  function addVoiceMessage(role, transcript) {
    const log = loadVoiceHistory();
    const msg = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role,
      transcript,
      ts: Date.now(),
      estDurationSec: estimateDurationFromText(transcript),
    };
    log.push(msg);
    saveVoiceHistory(log);
    renderVoiceLog();
    return msg;
  }

  function deleteVoiceMessage(id) {
    let log = loadVoiceHistory();
    log = log.filter((m) => m.id !== id);
    saveVoiceHistory(log);
    renderVoiceLog();
  }

  function resetVoiceChat() {
    if (typeof stopAllTTS === "function") stopAllTTS();
    saveVoiceHistory([]);
    renderVoiceLog();
  }

  // ---- TTS ----
  const ttsSupported = "speechSynthesis" in window;
  let ttsState = {
    currentId: null,
    status: "idle",
    timer: null,
    startTime: 0,
    elapsedBeforePause: 0,
    utterance: null,
  };

  function clearTTSTimer() {
    if (ttsState.timer) {
      clearInterval(ttsState.timer);
      ttsState.timer = null;
    }
  }

  function resetBubbleVisual(id) {
    if (!id) return;
    const row = voiceMessagesEl.querySelector(`.voice-row[data-id="${id}"]`);
    if (!row) return;
    const icon = row.querySelector(".voice-icon");
    const currentEl = row.querySelector(".voice-current");
    if (!icon || !currentEl) return;
    icon.textContent = "▶";
    currentEl.textContent = "0:00";
  }

  function stopAllTTS() {
    if (!ttsSupported) return;
    try { window.speechSynthesis.cancel(); } catch (e) { }
    clearTTSTimer();
    if (ttsState.currentId) resetBubbleVisual(ttsState.currentId);
    ttsState.currentId = null;
    ttsState.status = "idle";
    ttsState.elapsedBeforePause = 0;
    ttsState.utterance = null;
  }

  function updatePlayingUI() {
    if (!ttsState.currentId) return;
    const row = voiceMessagesEl.querySelector(`.voice-row[data-id="${ttsState.currentId}"]`);
    if (!row) return;
    const currentEl = row.querySelector(".voice-current");
    if (!currentEl) return;

    const log = loadVoiceHistory();
    const msg = log.find((m) => m.id === ttsState.currentId);
    const totalSec = msg?.estDurationSec || estimateDurationFromText(msg?.transcript || "");

    const now = performance.now();
    const elapsedMs =
      ttsState.elapsedBeforePause +
      (ttsState.status === "playing" ? now - ttsState.startTime : 0);

    const elapsedSec = Math.min(totalSec, elapsedMs / 1000);
    currentEl.textContent = formatTime(elapsedSec);
  }

  function startTimerFor() {
    clearTTSTimer();
    ttsState.timer = setInterval(updatePlayingUI, 100);
  }

  function pickDefaultLatinoVoice(voices) {
    if (!voices?.length) return null;
    const spanish = voices.filter(v => (v.lang || "").toLowerCase().startsWith("es"));
    if (!spanish.length) return null;
    const latinHints = /mexico|méxico|mx|latino|colombia|argentina|chile|peru|perú|venezuela|ecuador|us|united states/i;
    let latin = spanish.filter(v => latinHints.test(v.name));
    if (!latin.length) latin = spanish;

    const maleHints = /(male|hombre|raul|raúl|carlos|jorge|miguel|pablo|enrique|luis|diego|andrés|andres|juan|josé|jose|antonio)/i;
    const male = latin.filter(v => maleHints.test(v.name));
    return (male[0] || latin[0]);
  }

  function populateVoices() {
    if (!voiceSelectEl) return;
    voiceSelectEl.innerHTML = "";

    if (!ttsSupported) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No hay voces disponibles en tu navegador.";
      voiceSelectEl.appendChild(opt);
      voiceSelectEl.disabled = true;
      return;
    }

    const allVoices = window.speechSynthesis.getVoices() || [];
    const voices = allVoices.filter(v => (v.lang || "").toLowerCase().startsWith("es"));

    if (!voices.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No se encontraron voces en español";
      voiceSelectEl.appendChild(opt);
      voiceSelectEl.disabled = true;
      return;
    }

    voiceSelectEl.disabled = false;

    let savedName = localStorage.getItem(VOICE_CHOICE_KEY) || "";
    if (savedName && !voices.some(v => v.name === savedName)) savedName = "";

    if (!savedName) {
      const def = pickDefaultLatinoVoice(voices) || voices[0];
      savedName = def.name;
      localStorage.setItem(VOICE_CHOICE_KEY, savedName);
    }

    voices.slice().sort((a, b) =>
      (a.lang || "").localeCompare(b.lang || "") || a.name.localeCompare(b.name)
    ).forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.name === savedName) opt.selected = true;
      voiceSelectEl.appendChild(opt);
    });
  }

  if (ttsSupported) {
    window.speechSynthesis.addEventListener("voiceschanged", populateVoices);
    populateVoices();
  }

  voiceSelectEl?.addEventListener("change", () => {
    localStorage.setItem(VOICE_CHOICE_KEY, voiceSelectEl.value);
  });

  function applySelectedVoice(utter) {
    if (!ttsSupported || !utter) return;
    const desiredName = localStorage.getItem(VOICE_CHOICE_KEY) || "";
    if (!desiredName) return;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === desiredName);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    }
  }

  function playVoiceMessage(msg) {
    if (!ttsSupported || !msg?.transcript) return;

    window.speechSynthesis.cancel();
    clearTTSTimer();

    if (ttsState.currentId && ttsState.currentId !== msg.id) {
      resetBubbleVisual(ttsState.currentId);
    }

    ttsState.currentId = msg.id;
    ttsState.status = "idle";
    ttsState.elapsedBeforePause = 0;

    const row = voiceMessagesEl.querySelector(`.voice-row[data-id="${msg.id}"]`);
    const icon = row?.querySelector(".voice-icon");
    const currentEl = row?.querySelector(".voice-current");
    if (!row || !icon || !currentEl) return;

    icon.textContent = "⏸";
    currentEl.textContent = "0:00";

    const utter = new SpeechSynthesisUtterance(msg.transcript);
    utter.lang = "es-ES";
    utter.rate = 1;
    utter.pitch = 1;

    applySelectedVoice(utter);

    utter.onstart = () => {
      ttsState.status = "playing";
      ttsState.startTime = performance.now();
      startTimerFor();
    };

    utter.onend = () => {
      clearTTSTimer();
      icon.textContent = "▶";
      ttsState.currentId = null;
      ttsState.elapsedBeforePause = 0;
      ttsState.utterance = null;
    };

    utter.onerror = () => {
      clearTTSTimer();
      icon.textContent = "▶";
      currentEl.textContent = "0:00";
      ttsState.status = "idle";
      ttsState.currentId = null;
      ttsState.elapsedBeforePause = 0;
      ttsState.utterance = null;
    };

    ttsState.utterance = utter;
    window.speechSynthesis.speak(utter);
  }

  function togglePlayPauseFor(id) {
    if (!ttsSupported) return;

    if (!ttsState.currentId || ttsState.currentId !== id || ttsState.status === "idle") {
      const log = loadVoiceHistory();
      const msg = log.find(m => m.id === id);
      if (msg) playVoiceMessage(msg);
      return;
    }

    const row = voiceMessagesEl.querySelector(`.voice-row[data-id="${id}"]`);
    const icon = row?.querySelector(".voice-icon");
    if (!icon) return;

    if (ttsState.status === "playing") {
      try { window.speechSynthesis.pause(); } catch (e) { }
      ttsState.status = "paused";
      ttsState.elapsedBeforePause += performance.now() - ttsState.startTime;
      clearTTSTimer();
      icon.textContent = "▶";
    } else if (ttsState.status === "paused") {
      try { window.speechSynthesis.resume(); } catch (e) { }
      ttsState.status = "playing";
      ttsState.startTime = performance.now();
      icon.textContent = "⏸";
      startTimerFor();
    }
  }

  // ---- STT ----
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sttSupported = !!SpeechRecognition;
  let recognizer = null;
  let isRecording = false;

  if (!sttSupported && voiceHintEl) {
    voiceHintEl.textContent = "⚠️ Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.";
    if (recordBtn) recordBtn.disabled = true;
  }

  if (sttSupported) {
    recognizer = new SpeechRecognition();
    recognizer.lang = "es-ES";
    recognizer.interimResults = true;
    recognizer.continuous = false;

    recognizer.onstart = () => {
      isRecording = true;
      if (voiceHintEl) voiceHintEl.textContent = "🎙️ Escuchando... habla ahora.";
      if (recordBtn) recordBtn.textContent = "⏹ Dejar de hablar";
    };

    recognizer.onerror = (e) => {
      console.error("Error STT:", e);
      if (voiceHintEl) voiceHintEl.textContent = "⚠️ Error al escuchar. Intenta de nuevo.";
      isRecording = false;
      if (recordBtn) recordBtn.textContent = "🎙️ Tocar para hablar";
    };

    recognizer.onend = () => {
      isRecording = false;
      if (voiceHintEl) voiceHintEl.textContent = "Rinkbot te escucha con tu micrófono.";
      if (recordBtn) recordBtn.textContent = "🎙️ Tocar para hablar";
    };

    recognizer.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      text = text.trim();

      const last = e.results[e.results.length - 1];
      if (!last.isFinal) return;

      if (text) handleUserVoice(text);
    };
  }

  async function handleUserVoice(transcript) {
    addVoiceMessage("user", transcript);

    try {
      if (voiceHintEl) voiceHintEl.textContent = "⌛ Consultando a Rinkbot...";
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: transcript,
          id_persona: currentUser.id_persona,
          tipo_chat: "voz",
          save: false
        }),
      });

      if (!response.ok) throw new Error("Respuesta no OK del backend");

      const data = await response.json();
      const botText = data.reply || "Hubo un problema al obtener la respuesta.";

      const botMsg = addVoiceMessage("bot", botText);
      if (voiceHintEl) voiceHintEl.textContent = "✅ Rinkbot respondió. Toca la nota para escucharla.";
      playVoiceMessage(botMsg);
    } catch (err) {
      console.error("Error llamando al backend (voz):", err);
      const fallback = "Ocurrió un error al conectar con Rinkbot. Intenta de nuevo.";
      const botMsg = addVoiceMessage("bot", fallback);
      if (voiceHintEl) voiceHintEl.textContent = "⚠️ Error al conectar con Rinkbot.";
      playVoiceMessage(botMsg);
    }
  }

  if (recordBtn && sttSupported) {
    recordBtn.addEventListener("click", () => {
      try {
        if (!isRecording) {
          recognizer.abort();
          recognizer.start();
        } else {
          recognizer.stop();
        }
      } catch (err) {
        console.warn("Error al iniciar/detener STT:", err);
      }
    });
  }

  // Play/Pause y borrar (delegación)
  if (voiceMessagesEl) {
    voiceMessagesEl.addEventListener("click", (e) => {
      const target = e.target;
      const row = target.closest(".voice-row");
      if (!row) return;

      const id = row.dataset.id;

      if (target.classList.contains("voice-delete")) {
        if (ttsState.currentId === id) stopAllTTS();
        deleteVoiceMessage(id);
        return;
      }

      const bubble = target.classList.contains("voice-bubble") ? target : target.closest(".voice-bubble");
      if (bubble) togglePlayPauseFor(id);
    });
  }

  voiceNewChatBtn?.addEventListener("click", resetVoiceChat);
  voiceSaveChatBtn?.addEventListener("click", () => saveFullChatToBackend("voz"));

  // ======================
  // ✅ PANEL MENSAJES (BD) - UNA SOLA IMPLEMENTACIÓN
  // ======================
  const refreshChatsBtn = document.getElementById("refreshChatsBtn");
  const onlyFavChatsEl = document.getElementById("onlyFavChats");
  const chatsListEl = document.getElementById("chatsList");

  const chatDetailEl = document.getElementById("chatDetail");
  const chatDetailTitleEl = document.getElementById("chatDetailTitle");

  // contenedor “bonito” (lo creamos si no existe)
  // ✅ Usa el contenedor del HTML
  const chatDetailThreadEl = document.getElementById("chatDetailConversation");
  const backToChatsBtn = document.getElementById("backToChatsBtn");



  let __currentChatDetail = null;
  let __mensajesListenersReady = false;

  function showChatListView() {
    if (chatsListEl) chatsListEl.style.display = "flex";
    if (chatDetailEl) chatDetailEl.style.display = "none";
    if (chatDetailThreadEl) chatDetailThreadEl.innerHTML = "";
    __currentChatDetail = null;
  }


  function showChatDetailView() {
    if (chatsListEl) chatsListEl.style.display = "none";
    if (chatDetailEl) chatDetailEl.style.display = "block";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeChatJsonToMessages(chat_json) {
    if (!chat_json) return [];

    // Array directo
    if (Array.isArray(chat_json)) {
      return chat_json
        .filter(m => m && (m.role || m.text || m.content))
        .map(m => ({
          role: m.role === "assistant" ? "bot" : (m.role || "bot"),
          text: m.text || m.content || "",
          ts: m.ts || null,
        }))
        .filter(m => m.text);
    }

    // Wrapper { type, log }
    if (typeof chat_json === "object" && Array.isArray(chat_json.log)) {
      const type = chat_json.type || "texto";

      if (type === "voz") {
        return chat_json.log
          .filter(m => m && m.role && (m.transcript || m.text))
          .map(m => ({
            role: m.role === "assistant" ? "bot" : m.role,
            text: m.transcript || m.text || "",
            ts: m.ts || null,
          }))
          .filter(m => m.text);
      }

      return chat_json.log
        .filter(m => m && (m.role || m.text || m.content))
        .map(m => ({
          role: m.role === "assistant" ? "bot" : (m.role || "bot"),
          text: m.text || m.content || "",
          ts: m.ts || null,
        }))
        .filter(m => m.text);
    }

    // Formato alterno
    if (typeof chat_json === "object" && (chat_json.question || chat_json.answer)) {
      const out = [];
      if (chat_json.question) out.push({ role: "user", text: String(chat_json.question), ts: null });
      if (chat_json.answer) out.push({ role: "bot", text: String(chat_json.answer), ts: null });
      return out;
    }

    return [];
  }

  function renderChatThread(containerEl, messages) {
    if (!containerEl) return;

    containerEl.innerHTML = "";

    if (!messages || !messages.length) {
      containerEl.innerHTML = `<p style="opacity:.75;">No se pudo renderizar este chat.</p>`;
      return;
    }

    const meAvatar = currentUser?.avatar_url || "../Assets/Avatar.png";
    const botAvatar = "../Assets/Rinko.png";

    messages.forEach((m) => {
      const row = document.createElement("div");
      row.className = `chatd-row ${m.role}`;

      const avatar = document.createElement("img");
      avatar.className = "chatd-avatar";
      avatar.src = m.role === "user" ? meAvatar : botAvatar;
      avatar.alt = m.role === "user" ? "Usuario" : "Rinkbot";

      const bubble = document.createElement("div");
      bubble.className = `chatd-bubble ${m.role}`;
      bubble.textContent = m.text;

      if (m.role === "user") {
        row.appendChild(bubble);
        row.appendChild(avatar);
      } else {
        row.appendChild(avatar);
        row.appendChild(bubble);
      }

      containerEl.appendChild(row);
    });

    containerEl.scrollTop = containerEl.scrollHeight;
  }

  async function initMensajesPanel({ onlyFavs = false } = {}) {
    if (onlyFavChatsEl) onlyFavChatsEl.checked = !!onlyFavs;

    if (!__mensajesListenersReady) {
      backToChatsBtn?.addEventListener("click", async () => {
        showChatListView();
        await loadChatsList({ onlyFavs: onlyFavChatsEl?.checked || false });
      });

      deleteChatBtn?.addEventListener("click", async () => {
        const idChat = __currentChatDetail?.id_chat;
        if (!idChat) return;

        const ok = confirm("¿Seguro que quieres eliminar este chat?");
        if (!ok) return;

        await deleteChat(idChat);
      });

      refreshChatsBtn?.addEventListener("click", () => {
        loadChatsList({ onlyFavs: onlyFavChatsEl?.checked || false });
      });

      onlyFavChatsEl?.addEventListener("change", () => {
        loadChatsList({ onlyFavs: !!onlyFavChatsEl.checked });
      });

      chatsListEl?.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const idChat = Number(btn.dataset.idchat);
        if (!idChat) return;

        const action = btn.dataset.action;

        if (action === "open") {
          await openChatDetail(idChat);
          return;
        }

        if (action === "fav") {
          const nextFav = btn.dataset.nextfav === "true";
          await toggleChatFav(idChat, nextFav);
          return;
        }

        if (action === "delete") {
          const ok = confirm("¿Seguro que quieres eliminar este chat?");
          if (!ok) return;
          await deleteChat(idChat);
          return;
        }
      });

      __mensajesListenersReady = true;
    }

    await loadChatsList({ onlyFavs: !!onlyFavs });
  }

  async function loadChatsList({ onlyFavs = false } = {}) {
    try {
      if (!currentUser?.id_persona || !chatsListEl) return;

      showChatListView();
      chatsListEl.innerHTML = `<p style="opacity:.75;">Cargando conversaciones...</p>`;

      const url = new URL(`${API_BASE_URL}/api/chats`);
      url.searchParams.set("id_persona", String(currentUser.id_persona));
      url.searchParams.set("limit", "50");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("No OK listando chats");

      const data = await res.json();
      const chats = (data.chats || []).filter(c => (onlyFavs ? !!c.favorito : true));

      if (!chats.length) {
        chatsListEl.innerHTML = `<p style="opacity:.75;">No hay chats guardados${onlyFavs ? " en favoritos" : ""}.</p>`;
        return;
      }

      chatsListEl.innerHTML = chats.map((c) => {
        const title = escapeHtml(c.titulo || "Chat sin título");
        const when = c.created_at ? new Date(c.created_at).toLocaleString() : "";
        const fav = !!c.favorito;

        return `
          <div class="chat-card">
            <div class="chat-card-top">
              <div>
                <p class="chat-card-title">${title}</p>
                <p class="chat-card-meta">${escapeHtml(c.tipo_chat || "")}${when ? " • " + escapeHtml(when) : ""}</p>
              </div>
              <div class="chat-card-actions">
                <button
                  class="chat-mini-btn chat-fav-btn ${fav ? "is-fav" : ""}"
                  type="button"
                  title="Favorito"
                  data-action="fav"
                  data-idchat="${c.id_chat}"
                  data-nextfav="${fav ? "false" : "true"}"
                >⭐</button>

                <button
                  class="chat-mini-btn"
                  type="button"
                  title="Eliminar chat"
                  data-action="delete"
                  data-idchat="${c.id_chat}"
                >🗑️</button>

                <button
                  class="chat-mini-btn"
                  type="button"
                  data-action="open"
                  data-idchat="${c.id_chat}"
                >Abrir</button>
              </div>
            </div>
          </div>
        `;
      }).join("");
    } catch (e) {
      console.error("Error cargando chats:", e);
      if (chatsListEl) chatsListEl.innerHTML = `<p style="opacity:.75;">Error cargando historial.</p>`;
    }
  }

  async function openChatDetail(idChat) {
    try {
      if (!currentUser?.id_persona) return;

      const url = new URL(`${API_BASE_URL}/api/chats/${idChat}`);
      url.searchParams.set("id_persona", String(currentUser.id_persona));

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("No OK get chat");

      const data = await res.json();
      const chat = data.chat;

      __currentChatDetail = chat;

      if (chatDetailTitleEl) chatDetailTitleEl.textContent = `Chat #${chat.id_chat} • ${chat.titulo || "Sin título"}`;

      // ✅ conversación “bonita”
      const messages = normalizeChatJsonToMessages(chat.chat_json);
      renderChatThread(chatDetailThreadEl, messages);

      // (Opcional) mantiene JSON oculto para debug / descargar

      showChatDetailView();
    } catch (e) {
      console.error("Error abriendo detalle:", e);
      alert("No se pudo abrir este chat.");
    }
  }

  // ✅ endpoint: /favorite
  async function toggleChatFav(idChat, favorito) {
    try {
      if (!currentUser?.id_persona) return;

      const res = await fetch(`${API_BASE_URL}/api/chats/${idChat}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_persona: currentUser.id_persona,
          favorito: !!favorito,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("No se pudo actualizar favorito:", err);
        alert("No se pudo actualizar favorito.");
        return;
      }

      await loadChatsList({ onlyFavs: onlyFavChatsEl?.checked || false });
    } catch (e) {
      console.error("Error actualizando favorito:", e);
      alert("Error actualizando favorito.");
    }
  }

  // ======================
  //  Inicial
  // ======================
  goToWelcome();
});
