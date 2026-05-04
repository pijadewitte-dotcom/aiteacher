const video = document.querySelector("#video");
const videoInput = document.querySelector("#videoInput");
const youtubeForm = document.querySelector("#youtubeForm");
const youtubeUrl = document.querySelector("#youtubeUrl");
const youtubePlayerElement = document.querySelector("#youtubePlayer");
const transcript = document.querySelector("#transcript");
const segmentList = document.querySelector("#segmentList");
const segmentCount = document.querySelector("#segmentCount");
const currentTitle = document.querySelector("#currentTitle");
const currentText = document.querySelector("#currentText");
const slowBtn = document.querySelector("#slowBtn");
const normalBtn = document.querySelector("#normalBtn");
const loopBtn = document.querySelector("#loopBtn");
const markStartBtn = document.querySelector("#markStartBtn");
const markEndBtn = document.querySelector("#markEndBtn");
const addSegmentBtn = document.querySelector("#addSegmentBtn");
const autoCutBtn = document.querySelector("#autoCutBtn");
const clearBtn = document.querySelector("#clearBtn");
const tabs = document.querySelectorAll(".tab");
const stepTitle = document.querySelector("#stepTitle");
const stepBody = document.querySelector("#stepBody");
const playStepBtn = document.querySelector("#playStepBtn");
const speakBtn = document.querySelector("#speakBtn");
const speechStatus = document.querySelector("#speechStatus");
const spokenText = document.querySelector("#spokenText");
const scoreValue = document.querySelector("#scoreValue");

let segments = [];
let activeIndex = -1;
let markStart = 0;
let markEnd = 0;
let loopActive = false;
let currentStep = "listen";
let playerMode = "local";
let youtubePlayer = null;
let pendingYouTubeId = "";

const stepCopy = {
  listen: {
    title: "Eerst kijken",
    body: "Kijk naar mondvorm, wenkbrauwen en pauzes. Je brein bouwt eerst een voorbeeld op.",
    rate: 1
  },
  slow: {
    title: "Traag nadoen",
    body: "Speel het stukje langzamer. Zeg alleen de klanken en het ritme mee, zonder haast.",
    rate: 0.75
  },
  repeat: {
    title: "Hardop herhalen",
    body: "Zeg de zin direct na. Kleine foutjes zijn goed: daarna wordt je poging scherper.",
    rate: 1
  },
  compare: {
    title: "Vergelijken",
    body: "Neem je stem op en vergelijk de woorden. Daarna oefen je alleen het verschil.",
    rate: 1
  }
};

videoInput.addEventListener("change", () => {
  const file = videoInput.files?.[0];
  if (!file) return;
  playerMode = "local";
  video.classList.add("active-player");
  youtubePlayerElement.classList.remove("active-player");
  if (youtubePlayer?.pauseVideo) youtubePlayer.pauseVideo();
  video.src = URL.createObjectURL(file);
  video.load();
});

youtubeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const videoId = getYouTubeId(youtubeUrl.value);
  if (!videoId) {
    youtubeUrl.setCustomValidity("Plak een geldige YouTube-link.");
    youtubeUrl.reportValidity();
    return;
  }
  youtubeUrl.setCustomValidity("");
  loadYouTubeVideo(videoId);
});

slowBtn.addEventListener("click", () => {
  setPlaybackRate(0.75);
});

normalBtn.addEventListener("click", () => {
  setPlaybackRate(1);
});

loopBtn.addEventListener("click", () => {
  loopActive = !loopActive;
  loopBtn.setAttribute("aria-pressed", String(loopActive));
});

markStartBtn.addEventListener("click", () => {
  markStart = getCurrentTime();
  markStartBtn.textContent = `Start ${formatTime(markStart)}`;
});

markEndBtn.addEventListener("click", () => {
  markEnd = getCurrentTime() || markStart + 4;
  markEndBtn.textContent = `Einde ${formatTime(markEnd)}`;
});

addSegmentBtn.addEventListener("click", () => {
  const start = Math.min(markStart, markEnd || markStart + 4);
  const end = Math.max(markEnd || markStart + 4, start + 1);
  const text = transcript.value.trim().split(/\n+/)[0] || "Nieuw oefenstukje";
  segments.push({ start, end, text });
  renderSegments();
  selectSegment(segments.length - 1);
});

autoCutBtn.addEventListener("click", () => {
  const pieces = splitTranscript(transcript.value);
  if (!pieces.length) return;
  const mediaDuration = getDuration();
  const duration = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : pieces.length * 5;
  const slice = Math.max(3, duration / pieces.length);
  segments = pieces.map((text, index) => ({
    text,
    start: Math.round(index * slice * 10) / 10,
    end: Math.round(Math.min(duration, (index + 1) * slice) * 10) / 10
  }));
  renderSegments();
  selectSegment(0);
});

clearBtn.addEventListener("click", () => {
  transcript.value = "";
  segments = [];
  activeIndex = -1;
  renderSegments();
  updateCurrent();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentStep = tab.dataset.step;
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    updateStep();
  });
});

playStepBtn.addEventListener("click", () => {
  if (activeIndex < 0) return;
  setPlaybackRate(stepCopy[currentStep].rate);
  playSegment(segments[activeIndex]);
});

speakBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    speechStatus.textContent = "Spraakherkenning is niet beschikbaar in deze browser. Probeer Chrome of Edge.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "nl-NL";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  speechStatus.textContent = "Ik luister...";
  speakBtn.disabled = true;

  recognition.onresult = (event) => {
    const said = event.results[0][0].transcript;
    spokenText.textContent = said;
    const target = segments[activeIndex]?.text || currentText.textContent;
    scoreValue.textContent = `${scoreSimilarity(target, said)}%`;
  };

  recognition.onerror = () => {
    speechStatus.textContent = "Luisteren lukte niet. Check microfoonrechten en probeer opnieuw.";
  };

  recognition.onend = () => {
    speakBtn.disabled = false;
    if (speechStatus.textContent === "Ik luister...") {
      speechStatus.textContent = "Klaar. Probeer opnieuw of kies een ander stukje.";
    }
  };

  recognition.start();
});

video.addEventListener("timeupdate", () => {
  if (playerMode !== "local" || !loopActive || activeIndex < 0) return;
  const segment = segments[activeIndex];
  if (video.currentTime >= segment.end) {
    video.currentTime = segment.start;
    video.play();
  }
});

setInterval(() => {
  if (playerMode !== "youtube" || !loopActive || activeIndex < 0 || !youtubePlayer?.getCurrentTime) return;
  const segment = segments[activeIndex];
  if (youtubePlayer.getCurrentTime() >= segment.end) {
    youtubePlayer.seekTo(segment.start, true);
    youtubePlayer.playVideo();
  }
}, 250);

function splitTranscript(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|;\s+|\n+/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .flatMap((piece) => chunkLongSentence(piece, 115));
}

function chunkLongSentence(sentence, maxLength) {
  if (sentence.length <= maxLength) return [sentence];
  const words = sentence.split(" ");
  const chunks = [];
  let current = "";
  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > maxLength && current) {
      chunks.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

function renderSegments() {
  segmentCount.textContent = String(segments.length);
  segmentList.innerHTML = "";

  segments.forEach((segment, index) => {
    const item = document.createElement("li");
    item.className = `segment${index === activeIndex ? " active" : ""}`;

    const copy = document.createElement("div");
    const text = document.createElement("p");
    text.textContent = segment.text;
    const time = document.createElement("small");
    time.textContent = `${formatTime(segment.start)} - ${formatTime(segment.end)}`;
    copy.append(text, time);

    const play = document.createElement("button");
    play.type = "button";
    play.textContent = "Oefen";
    play.addEventListener("click", () => {
      selectSegment(index);
      playSegment(segment);
    });

    item.append(copy, play);
    segmentList.append(item);
  });
}

function selectSegment(index) {
  activeIndex = index;
  renderSegments();
  updateCurrent();
}

function updateCurrent() {
  if (activeIndex < 0) {
    currentTitle.textContent = "Nog geen stukje gekozen";
    currentText.textContent = "Laad een video en plak tekst of maak zelf stukjes met start en einde.";
    scoreValue.textContent = "--";
    spokenText.textContent = "Je herhaling verschijnt hier.";
    return;
  }
  const segment = segments[activeIndex];
  currentTitle.textContent = `Stukje ${activeIndex + 1}: ${formatTime(segment.start)}`;
  currentText.textContent = segment.text;
  spokenText.textContent = "Je herhaling verschijnt hier.";
  scoreValue.textContent = "--";
}

function updateStep() {
  const copy = stepCopy[currentStep];
  stepTitle.textContent = copy.title;
  stepBody.textContent = copy.body;
}

function playSegment(segment) {
  if (playerMode === "youtube" && youtubePlayer?.seekTo) {
    youtubePlayer.seekTo(segment.start, true);
    youtubePlayer.playVideo();
    return;
  }
  video.currentTime = segment.start;
  video.play();
}

function getCurrentTime() {
  if (playerMode === "youtube" && youtubePlayer?.getCurrentTime) {
    return youtubePlayer.getCurrentTime() || 0;
  }
  return video.currentTime || 0;
}

function getDuration() {
  if (playerMode === "youtube" && youtubePlayer?.getDuration) {
    return youtubePlayer.getDuration() || 0;
  }
  return video.duration || 0;
}

function setPlaybackRate(rate) {
  if (playerMode === "youtube" && youtubePlayer?.setPlaybackRate) {
    youtubePlayer.setPlaybackRate(rate);
    return;
  }
  video.playbackRate = rate;
}

function loadYouTubeVideo(videoId) {
  playerMode = "youtube";
  video.pause();
  video.classList.remove("active-player");
  youtubePlayerElement.classList.add("active-player");

  if (!window.YT?.Player) {
    pendingYouTubeId = videoId;
    return;
  }

  if (!youtubePlayer) {
    youtubePlayer = new YT.Player("youtubePlayer", {
      videoId,
      playerVars: {
        playsinline: 1,
        rel: 0,
        modestbranding: 1
      }
    });
    return;
  }

  youtubePlayer.loadVideoById(videoId);
}

function getYouTubeId(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }
      return url.searchParams.get("v") || "";
    }
  } catch {
    return /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : "";
  }

  return "";
}

window.onYouTubeIframeAPIReady = () => {
  if (pendingYouTubeId) {
    const videoId = pendingYouTubeId;
    pendingYouTubeId = "";
    loadYouTubeVideo(videoId);
  }
};

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = Math.floor(safe % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function normalizeWords(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s'-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreSimilarity(target, attempt) {
  const expected = normalizeWords(target);
  const spoken = normalizeWords(attempt);
  if (!expected.length || !spoken.length) return 0;
  const spokenSet = new Set(spoken);
  const hits = expected.filter((word) => spokenSet.has(word)).length;
  const lengthPenalty = Math.min(expected.length, spoken.length) / Math.max(expected.length, spoken.length);
  return Math.round((hits / expected.length) * lengthPenalty * 100);
}

updateStep();
renderSegments();
