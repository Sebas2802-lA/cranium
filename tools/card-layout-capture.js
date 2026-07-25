const params = new URLSearchParams(location.search);
const modality = params.get("modalidad");
const variant = params.get("variante");
const face = params.get("cara") || "front";
const frame = document.querySelector("#captureFrame");
const files = [
  "../data/tarjetas-rojas.json",
  "../data/tarjetas-azules.json",
  "../data/tarjetas-verdes.json",
  "../data/tarjetas-amarillas.json"
];

const waitFor = (condition) => new Promise((resolve) => {
  const check = () => condition() ? resolve() : setTimeout(check, 25);
  check();
});

const score = (card) => [
  card.pregunta, card.afirmacion, card.pista, card.tema, card.palabra,
  card.anagrama, card.acertijo, card.cancion, card.artista,
  Array.isArray(card.opciones) ? card.opciones.join(" ") : "",
  Array.isArray(card.respuesta) ? card.respuesta.join(" ") : card.respuesta,
  card.explicacion
].filter(Boolean).join(" ").length;

Promise.all(files.map((file) => fetch(file).then((response) => response.json())))
  .then((banks) => banks.flat())
  .then(async (cards) => {
    await waitFor(() =>
      frame.contentDocument?.querySelector("#loadingMessage")?.textContent === "Elige un color"
    );
    const candidates = cards.filter((card) =>
      card.modalidad === modality && (!variant || card.variante === variant)
    );
    const card = candidates.sort((a, b) => score(b) - score(a))[0];
    if (!card) throw new Error(`No se encontró ${modality}/${variant || "*"}`);

    const win = frame.contentWindow;
    win.showCardScreen();
    win.renderCard(card);
    win.updateCardHeight();
    if (face === "back") frame.contentDocument.querySelector("#flipCard").classList.add("is-flipped");
    document.title = `CAPTURE_READY_${card.id}`;
  })
  .catch((error) => {
    document.title = "CAPTURE_ERROR";
    document.body.dataset.error = error.message;
  });
