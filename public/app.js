const ui = {
  root: document.querySelector(".experience"), status: document.querySelector(".status"), start: document.querySelector(".start"),
  presence: document.querySelector(".presence"), captions: document.querySelector(".captions"), settings: document.querySelector(".settings"),
  toggle: document.querySelector(".settings-toggle"), textForm: document.querySelector(".text-entry"), textInput: document.querySelector("#textInput")
};
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition, active = false, speaking = false, visemeTimer;
const history = [];

function state(name, label) { ui.root.dataset.state = name; ui.status.textContent = label; }
function caption(text) { if (document.querySelector("#captions").checked) { ui.captions.hidden = false; ui.captions.textContent = text; } }

function createRecognition() {
  if (!SpeechRecognition) return null;
  const rec = new SpeechRecognition();
  rec.continuous = false; rec.interimResults = true; rec.lang = navigator.language || "en-US";
  rec.onstart = () => state("listening", "Listening");
  rec.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (result.isFinal && result[0].transcript.trim()) respond(result[0].transcript.trim());
  };
  rec.onerror = ({ error }) => {
    if (error === "no-speech" && active) return restartSoon();
    active = false; ui.root.classList.remove("active");
    state("idle", error === "not-allowed" ? "Microphone access is needed" : "I couldn't hear you — try again");
  };
  rec.onend = () => { if (active && !speaking && ui.root.dataset.state === "listening") restartSoon(); };
  return rec;
}

function restartSoon() { setTimeout(() => { if (active && !speaking) try { recognition.start(); } catch {} }, 350); }
function stopListening() { try { recognition?.abort(); } catch {} }

async function getReply(text) {
  history.push({ role: "user", content: text });
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history }) });
    if (response.ok) return (await response.json()).text;
  } catch {}
  const lower = text.toLowerCase();
  const name = history.find(x => x.role === "user" && /my name is/i.test(x.content))?.content.match(/my name is\s+([\w'-]+)/i)?.[1];
  if (/hello|\bhi\b|hey/.test(lower)) return `Hello${name ? `, ${name}` : ""}. It's good to meet you. What's on your mind?`;
  if (/your name/.test(lower)) return "I'm Nova. Think of me as a calm, curious mind you can talk to.";
  if (/first computer/.test(lower)) return "Charles Babbage is often called the father of the computer. He designed the Analytical Engine in the eighteen thirties, though it was never completed in his lifetime.";
  if (/when was he born/.test(lower) && history.some(x => /Charles Babbage/i.test(x.content))) return "Charles Babbage was born on December twenty-sixth, seventeen ninety-one, in London.";
  if (/time/.test(lower)) return `It's ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
  if (/thank/.test(lower)) return "You're very welcome. I'm right here if you'd like to keep going.";
  return "I heard you. My live intelligence isn't connected yet, but my voice and presence are working. Add an OpenAI API key on the server and we can explore that properly together.";
}

async function respond(text) {
  stopListening(); state("thinking", "Thinking"); caption(`You: ${text}`);
  const reply = await getReply(text); history.push({ role: "assistant", content: reply });
  speak(reply);
}

const viseme = char => {
  if (/[mbp]/i.test(char)) return [0.02, .82]; if (/[fv]/i.test(char)) return [.25, 1.1];
  if (/[a]/i.test(char)) return [.92, .95]; if (/[ei]/i.test(char)) return [.46, 1.18];
  if (/[o]/i.test(char)) return [.66, .7]; if (/[uwq]/i.test(char)) return [.42, .58];
  if (/[ltdn]/i.test(char)) return [.38, 1.02]; if (/\s|[.,!?]/.test(char)) return [.04, 1]; return [.28, 1];
};
function animateSpeech(text, utterance) {
  let i = 0; clearInterval(visemeTimer);
  visemeTimer = setInterval(() => {
    const [open, wide] = viseme(text[i++ % text.length]);
    ui.root.style.setProperty("--mouth-open", open); ui.root.style.setProperty("--mouth-wide", wide);
  }, Math.max(65, 92 / (utterance.rate || 1)));
}
function speak(text) {
  speaking = true; state("speaking", "Speaking"); caption(`Nova: ${text}`);
  const utterance = new SpeechSynthesisUtterance(text); utterance.rate = .96; utterance.pitch = .93;
  const voices = speechSynthesis.getVoices(); utterance.voice = voices.find(v => /Samantha|Ava|Google UK English Female|Natural/i.test(v.name)) || voices.find(v => v.lang.startsWith("en")) || null;
  utterance.onstart = () => animateSpeech(text, utterance);
  utterance.onboundary = e => { if (e.charIndex != null) { const [o,w] = viseme(text[e.charIndex] || " "); ui.root.style.setProperty("--mouth-open",o); ui.root.style.setProperty("--mouth-wide",w); } };
  utterance.onend = utterance.onerror = () => { clearInterval(visemeTimer); ui.root.style.setProperty("--mouth-open", .04); speaking = false; if (active) restartSoon(); else state("idle", "Ready when you are"); };
  speechSynthesis.cancel(); speechSynthesis.speak(utterance);
}

async function toggleConversation() {
  if (active) { active = false; speaking = false; stopListening(); speechSynthesis.cancel(); ui.root.classList.remove("active"); state("idle", "Conversation paused"); return; }
  recognition ||= createRecognition();
  if (!recognition) { state("idle", "Voice recognition isn't supported here"); ui.textForm.hidden = false; return; }
  active = true; ui.root.classList.add("active"); recognition.start();
}
ui.start.addEventListener("click", toggleConversation); ui.presence.addEventListener("click", () => active && toggleConversation());
ui.toggle.addEventListener("click", () => { ui.settings.hidden = !ui.settings.hidden; ui.toggle.setAttribute("aria-expanded", String(!ui.settings.hidden)); });
document.querySelector("#reduced").addEventListener("change", e => ui.root.classList.toggle("reduced", e.target.checked));
document.querySelector("#captions").addEventListener("change", e => ui.captions.hidden = !e.target.checked);
document.querySelector("#textMode").addEventListener("click", () => { ui.textForm.hidden = false; ui.settings.hidden = true; ui.textInput.focus(); });
ui.textForm.addEventListener("submit", e => { e.preventDefault(); const text = ui.textInput.value.trim(); if (text) { ui.textInput.value = ""; respond(text); } });
document.addEventListener("keydown", e => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); toggleConversation(); } if (e.key === "Escape" && active) toggleConversation(); });
