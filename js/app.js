const DATA_FILES = {
  rojo: "data/tarjetas-rojas.json",
  azul: "data/tarjetas-azules.json",
  amarillo: "data/tarjetas-amarillas.json",
  verde: "data/tarjetas-verdes.json"
};

const COLOR_VALUES = {
  rojo: "#ec4059",
  azul: "#347cf3",
  amarillo: "#f2c63f",
  verde: "#3dbf79"
};

const STORAGE_KEY = "craniumPlayedCardsV2";

const state = {
  modalities: {},
  cardsByColor: { rojo: [], azul: [], amarillo: [], verde: [] },
  currentCard: null,
  playedIds: loadPlayedIds()
};

let lastMeasuredCardWidth = 0;
let cardHeightFrame = 0;

const elements = {
  homeScreen: document.querySelector("#homeScreen"),
  cardScreen: document.querySelector("#cardScreen"),
  loadingMessage: document.querySelector("#loadingMessage"),
  flipCard: document.querySelector("#flipCard"),
  cardFront: document.querySelector("#cardFront"),
  cardBack: document.querySelector("#cardBack"),
  familyName: document.querySelector("#familyName"),
  variantLabel: document.querySelector("#variantLabel"),
  modeName: document.querySelector("#modeName"),
  modeInstruction: document.querySelector("#modeInstruction"),
  fullInstructionsButton: document.querySelector("#fullInstructionsButton"),
  instructionsDialog: document.querySelector("#instructionsDialog"),
  instructionsDialogTitle: document.querySelector("#instructionsDialogTitle"),
  fullInstructionText: document.querySelector("#fullInstructionText"),
  closeInstructionsButton: document.querySelector("#closeInstructionsButton"),
  cardContent: document.querySelector("#cardContent"),
  answerContent: document.querySelector("#answerContent"),
  showAnswerButton: document.querySelector("#showAnswerButton"),
  reportButton: document.querySelector("#reportButton"),
  backButton: document.querySelector("#backButton"),
  resetDecksButton: document.querySelector("#resetDecksButton"),
  reportDialog: document.querySelector("#reportDialog"),
  reportCardReference: document.querySelector("#reportCardReference"),
  reportReason: document.querySelector("#reportReason"),
  reportDetails: document.querySelector("#reportDetails"),
  copyReportButton: document.querySelector("#copyReportButton"),
  toast: document.querySelector("#toast")
};

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  bindEvents();

  try {
    const [modalities, red, blue, yellow, green] = await Promise.all([
      fetchJson("data/modalidades.json"),
      fetchJson(DATA_FILES.rojo),
      fetchJson(DATA_FILES.azul),
      fetchJson(DATA_FILES.amarillo),
      fetchJson(DATA_FILES.verde)
    ]);

    state.modalities = modalities;
    state.cardsByColor.rojo = red;
    state.cardsByColor.azul = blue;
    state.cardsByColor.amarillo = yellow;
    state.cardsByColor.verde = green;

    updateCounters();
    elements.loadingMessage.textContent = "Elige un color";
  } catch (error) {
    console.error(error);
    elements.loadingMessage.textContent =
      "No se pudieron cargar las tarjetas. Usa GitHub Pages o un servidor local.";
  }
}

function bindEvents() {
  document.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => drawCard(button.dataset.color));
  });

  elements.showAnswerButton.addEventListener("click", toggleAnswer);
  elements.backButton.addEventListener("click", showHome);
  elements.resetDecksButton.addEventListener("click", resetPlayedCards);
  elements.reportButton.addEventListener("click", openReportDialog);
  elements.copyReportButton.addEventListener("click", copyReport);
  elements.fullInstructionsButton.addEventListener("click", openInstructionsDialog);
  elements.closeInstructionsButton.addEventListener("click", closeInstructionsDialog);
  elements.instructionsDialog.addEventListener("click", (event) => {
    if (event.target === elements.instructionsDialog) closeInstructionsDialog();
  });

  const cardResizeObserver = new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width;
    if (Math.abs(width - lastMeasuredCardWidth) < 0.5) return;
    lastMeasuredCardWidth = width;
    scheduleCardHeightUpdate();
  });
  cardResizeObserver.observe(elements.flipCard);

  document.fonts?.ready.then(scheduleCardHeightUpdate);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
}

function drawCard(color) {
  const allCards = state.cardsByColor[color] ?? [];

  if (allCards.length === 0) {
    showToast("Esta categoría todavía no tiene tarjetas.");
    return;
  }

  let available = allCards.filter((card) => !state.playedIds.includes(card.id));

  if (available.length === 0) {
    const restart = window.confirm(
      "Ya se jugaron todas las tarjetas de este color. ¿Quieres reiniciar este mazo?"
    );

    if (!restart) return;

    const colorIds = new Set(allCards.map((card) => card.id));
    state.playedIds = state.playedIds.filter((id) => !colorIds.has(id));
    savePlayedIds();
    available = [...allCards];
  }

  const selected = available[Math.floor(Math.random() * available.length)];
  state.currentCard = selected;
  state.playedIds.push(selected.id);
  savePlayedIds();

  updateCounters();
  renderCard(selected);
  showCardScreen();
}

function renderCard(card) {
  const modality = state.modalities[card.modalidad];
  const activeColor = COLOR_VALUES[card.color] ?? COLOR_VALUES.amarillo;

  applyContentDensity(card, modality);
  elements.flipCard.classList.remove("is-flipped");
  elements.cardFront.dataset.color = card.color;
  elements.cardBack.dataset.color = card.color;
  elements.showAnswerButton.style.setProperty("--active-color", activeColor);

  elements.familyName.textContent = card.familia;
  elements.modeName.textContent = modality?.nombre ?? card.modalidad;
  elements.variantLabel.textContent =
    card.variante === "todos_juegan" ? "Todos juegan" : "";
  elements.modeInstruction.textContent = getInstruction(modality, card, "instruccion_breve");
  elements.fullInstructionText.textContent =
    getInstruction(modality, card, "instruccion_completa");
  elements.instructionsDialogTitle.textContent =
    `${modality?.nombre ?? card.modalidad}${
      card.variante === "todos_juegan" ? " · Todos juegan" : ""
    }`;

  elements.cardContent.innerHTML = buildCardContent(card);
  elements.answerContent.innerHTML = buildAnswer(card);
  elements.showAnswerButton.textContent = "Mostrar respuesta";
  scheduleCardHeightUpdate();
}

function getInstruction(modality, card, field) {
  const variant = card.variante === "todos_juegan" ? "todos_juegan" : "normal";
  const instructions = modality?.[field];

  if (typeof instructions === "string") return instructions;
  return instructions?.[variant] ?? instructions?.normal ?? modality?.instruccion ?? "";
}

function applyContentDensity(card, modality) {
  const instruction = getInstruction(modality, card, "instruccion_breve");
  const options = Array.isArray(card.opciones) ? card.opciones.map(String) : [];
  const optionCharacters = options.reduce((total, option) => total + option.length, 0);
  const primaryCharacters = [
    card.pregunta,
    card.afirmacion,
    card.tema,
    card.pista,
    card.palabra,
    card.anagrama,
    card.acertijo
  ].filter(Boolean).join(" ").length;
  const answer = Array.isArray(card.respuesta)
    ? card.respuesta.join(" y ")
    : String(card.respuesta ?? card.personaje ?? card.cancion ?? "");
  const explanation = String(card.explicacion ?? card.artista ?? "");
  const frontScore =
    instruction.length * 0.72 +
    primaryCharacters * 1.15 +
    optionCharacters +
    options.length * 34;
  const backScore = answer.length * 1.65 + explanation.length;
  const densityScore = Math.max(frontScore, backScore);

  elements.flipCard.classList.remove(
    "content-density--normal",
    "content-density--dense",
    "content-density--very-dense",
    "has-long-options",
    "has-many-options"
  );
  elements.flipCard.classList.add(
    densityScore > 430
      ? "content-density--very-dense"
      : densityScore > 270
        ? "content-density--dense"
        : "content-density--normal"
  );
  if (options.some((option) => option.length > 68) || optionCharacters > 235) {
    elements.flipCard.classList.add("has-long-options");
  }
  if (options.length >= 5) elements.flipCard.classList.add("has-many-options");

  elements.cardBack.classList.remove(
    "answer-density--normal",
    "answer-density--dense",
    "answer-density--very-dense"
  );
  elements.cardBack.classList.add(
    answer.length > 85 || explanation.length > 230
      ? "answer-density--very-dense"
      : answer.length > 42 || explanation.length > 120
        ? "answer-density--dense"
        : "answer-density--normal"
  );
}

function scheduleCardHeightUpdate() {
  window.cancelAnimationFrame(cardHeightFrame);
  cardHeightFrame = window.requestAnimationFrame(updateCardHeight);
}

function updateCardHeight() {
  elements.flipCard.style.removeProperty("--card-height");

  const frontHeight = Math.ceil(
    Math.max(elements.cardFront.scrollHeight, elements.cardFront.getBoundingClientRect().height)
  );
  const backHeight = Math.ceil(
    Math.max(elements.cardBack.scrollHeight, elements.cardBack.getBoundingClientRect().height)
  );
  const requiredHeight = Math.max(frontHeight, backHeight);

  elements.flipCard.style.setProperty("--card-height", `${requiredHeight}px`);
}

function buildCardContent(card) {
  switch (card.modalidad) {
    case "opcionometro":
      return `${contentBlock("Pregunta", card.pregunta)}${optionList(card.opciones)}`;

    case "si_o_no":
      return contentBlock("Afirmación", card.afirmacion);

    case "par_de_dos":
      return `${contentBlock("Tema", card.tema)}${optionList(card.opciones)}`;

    case "sapienreto":
      return contentBlock("Pregunta", card.pregunta);

    case "escultorama":
    case "dibunoveo":
    case "pintacierta":
    case "titerin":
    case "adimimo":
      return `
        ${contentBlock("Pista", card.pista)}
        <p class="content-secondary">La respuesta debe verla únicamente quien realiza la prueba.</p>
      `;

    case "imiton":
      return `
        <p class="content-label">Personaje</p>
        <p class="content-primary">Entrega la pantalla al jugador que hará la imitación.</p>
      `;

    case "tarasilba":
      return `
        <p class="content-label">Canción</p>
        <p class="content-primary">Entrega la pantalla al jugador que va a tararear o silbar.</p>
      `;

    case "buscapalabras":
      return `
        ${contentBlock("Pista", card.pista)}
        <p class="content-label">Acertijo</p>
        <p class="content-primary word-pattern">${escapeHtml(card.acertijo)}</p>
      `;

    case "lexicon":
      return `${contentBlock("Palabra", card.palabra)}${optionList(card.opciones)}`;

    case "ordenigma":
      return `
        ${contentBlock("Pista", card.pista)}
        <p class="content-label">Anagrama</p>
        <p class="content-primary anagram">${escapeHtml(card.anagrama)}</p>
      `;

    case "piensaigual":
      return `
        ${contentBlock("Tema", card.tema)}
        <p class="content-secondary">Cada jugador escribe tres palabras sin mostrarlas a los demás.</p>
      `;

    case "todos_patras":
      return contentBlock("Palabra", card.palabra);

    default:
      return contentBlock(
        "Prueba",
        card.pregunta ?? card.pista ?? card.tema ?? "Contenido pendiente"
      );
  }
}

function buildAnswer(card) {
  let mainAnswer = card.respuesta;
  const details = [];

  if (Array.isArray(mainAnswer)) mainAnswer = mainAnswer.join(" y ");

  if (card.modalidad === "imiton" && card.personaje) {
    mainAnswer = card.personaje;
  }

  if (card.modalidad === "tarasilba") {
    mainAnswer = card.cancion;
    if (card.artista) details.push(`Artista: ${card.artista}`);
  }

  if (card.explicacion) details.push(card.explicacion);

  return `
    <span>${escapeHtml(String(mainAnswer ?? "Sin respuesta registrada"))}</span>
    ${
      details.length
        ? `<span class="answer-explanation">${escapeHtml(details.join(" · "))}</span>`
        : ""
    }
  `;
}

function contentBlock(label, content) {
  return `
    <p class="content-label">${escapeHtml(label)}</p>
    <p class="content-primary">${escapeHtml(String(content))}</p>
  `;
}

function optionList(options = []) {
  return `
    <ol class="option-list">
      ${options.map((option) => `<li>${escapeHtml(String(option))}</li>`).join("")}
    </ol>
  `;
}

function toggleAnswer() {
  const willShowAnswer = !elements.flipCard.classList.contains("is-flipped");
  elements.flipCard.classList.toggle("is-flipped", willShowAnswer);
  elements.showAnswerButton.textContent =
    willShowAnswer ? "Volver a la prueba" : "Mostrar respuesta";
}

function showCardScreen() {
  elements.homeScreen.classList.remove("screen--active");
  elements.cardScreen.classList.add("screen--active");
  window.scrollTo(0, 0);
}

function showHome() {
  elements.flipCard.classList.remove("is-flipped");
  elements.cardScreen.classList.remove("screen--active");
  elements.homeScreen.classList.add("screen--active");
  state.currentCard = null;
  updateCounters();
  window.scrollTo(0, 0);
}

function updateCounters() {
  Object.entries(state.cardsByColor).forEach(([color, cards]) => {
    const remaining = cards.filter((card) => !state.playedIds.includes(card.id)).length;
    const counter = document.querySelector(`[data-count="${color}"]`);
    if (counter) counter.textContent = `${remaining} de ${cards.length}`;
  });
}

function resetPlayedCards() {
  const confirmed = window.confirm(
    "¿Quieres permitir que todas las tarjetas vuelvan a aparecer?"
  );
  if (!confirmed) return;

  state.playedIds = [];
  savePlayedIds();
  updateCounters();
  showToast("Mazos reiniciados.");
}

function openInstructionsDialog() {
  if (!state.currentCard) return;
  elements.instructionsDialog.showModal();
}

function closeInstructionsDialog() {
  elements.instructionsDialog.close();
}

function openReportDialog() {
  if (!state.currentCard) return;

  const modality = state.modalities[state.currentCard.modalidad];
  elements.reportCardReference.textContent =
    `${state.currentCard.familia} · ${modality?.nombre ?? state.currentCard.modalidad}`;
  elements.reportDetails.value = "";
  elements.reportDialog.showModal();
}

async function copyReport() {
  if (!state.currentCard) return;

  const reportText = [
    "REPORTE DE TARJETA",
    `Familia: ${state.currentCard.familia}`,
    `Modalidad: ${state.currentCard.modalidad}`,
    `Problema: ${elements.reportReason.value}`,
    `Detalle: ${elements.reportDetails.value.trim() || "Sin detalle adicional"}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(reportText);
    elements.reportDialog.close();
    showToast("Reporte copiado.");
  } catch {
    window.prompt("Copia este reporte:", reportText);
  }
}

function loadPlayedIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function savePlayedIds() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.playedIds));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("toast--visible");

  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.remove("toast--visible");
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
