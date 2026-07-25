const RESOLUTIONS = [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 720],
  [1024, 768],
  [768, 1024],
  [480, 800],
  [390, 844],
  [360, 800]
];

const DATA_FILES = [
  "../data/tarjetas-rojas.json",
  "../data/tarjetas-azules.json",
  "../data/tarjetas-verdes.json",
  "../data/tarjetas-amarillas.json"
];

const frame = document.querySelector("#auditFrame");
const resultNode = document.querySelector("#result");
const encodeReport = (report) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(report))));

function waitFor(condition, timeout = 15000) {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) return resolve();
      if (performance.now() - started > timeout) return reject(new Error("Tiempo de espera agotado"));
      setTimeout(check, 25);
    };
    check();
  });
}

function nextFrame(win) {
  return new Promise((resolve) => win.requestAnimationFrame(() => resolve()));
}

function intersects(a, b, tolerance = 1) {
  return (
    a.right > b.left + tolerance &&
    a.left < b.right - tolerance &&
    a.bottom > b.top + tolerance &&
    a.top < b.bottom - tolerance
  );
}

function outside(inner, outer, tolerance = 2) {
  return (
    inner.left < outer.left - tolerance ||
    inner.right > outer.right + tolerance ||
    inner.top < outer.top - tolerance ||
    inner.bottom > outer.bottom + tolerance
  );
}

function visible(element) {
  if (!element) return false;
  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function auditFace({ card, resolution, faceName, doc, failures }) {
  const face = doc.querySelector(faceName === "front" ? "#cardFront" : "#cardBack");
  const faceRect = face.getBoundingClientRect();
  const implicated = faceName === "front"
    ? [
        ["header", doc.querySelector(".physical-card__header")],
        ["instruction", doc.querySelector(".physical-card__rule")],
        ["content", doc.querySelector(".physical-card__content")]
      ]
    : [
        ["answer", doc.querySelector(".answer-side__content")]
      ];

  const addFailure = (type, elements) => failures.push({
    id: card.id,
    numero: card.numero ?? null,
    categoria: card.familia,
    modalidad: card.modalidad,
    variante: card.variante,
    resolucion: `${resolution[0]}x${resolution[1]}`,
    cara: faceName,
    tipo: type,
    elementos: elements
  });

  for (const [name, element] of implicated) {
    if (!visible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (outside(rect, faceRect)) addFailure("element-outside-face", [name]);
    if (element.scrollWidth > element.clientWidth + 2) addFailure("horizontal-overflow", [name]);
    const style = doc.defaultView.getComputedStyle(element);
    if (
      element.scrollHeight > element.clientHeight + 3 &&
      ["hidden", "clip"].includes(style.overflowY)
    ) {
      addFailure("vertical-overflow", [name]);
    }
  }

  for (let index = 0; index < implicated.length - 1; index += 1) {
    const [firstName, first] = implicated[index];
    const [secondName, second] = implicated[index + 1];
    if (visible(first) && visible(second) && intersects(first.getBoundingClientRect(), second.getBoundingClientRect())) {
      addFailure("block-overlap", [firstName, secondName]);
    }
  }

  if (faceName === "front") {
    const options = [...doc.querySelectorAll(".option-list li")];
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const optionRect = option.getBoundingClientRect();
      if (outside(optionRect, faceRect)) addFailure("option-outside-face", [`option-${index + 1}`]);
      if (option.scrollWidth > option.clientWidth + 2 || option.scrollHeight > option.clientHeight + 2) {
        addFailure("option-overflow", [`option-${index + 1}`]);
      }
      for (let other = index + 1; other < options.length; other += 1) {
        if (intersects(optionRect, options[other].getBoundingClientRect())) {
          addFailure("option-overlap", [`option-${index + 1}`, `option-${other + 1}`]);
        }
      }
    }

    const instruction = doc.querySelector("#modeInstruction");
    const instructionSize = parseFloat(doc.defaultView.getComputedStyle(instruction).fontSize);
    if (instructionSize < 14) addFailure("illegible-font-size", ["instruction"]);

    const controls = doc.querySelector(".card-controls").getBoundingClientRect();
    if (intersects(faceRect, controls)) addFailure("controls-overlap-card", ["face", "controls"]);
  } else {
    const answer = doc.querySelector(".answer-side__content");
    const answerSize = parseFloat(doc.defaultView.getComputedStyle(answer).fontSize);
    if (answerSize < 24) addFailure("illegible-font-size", ["answer"]);
  }
}

async function auditModal({ card, resolution, doc, failures }) {
  const dialog = doc.querySelector("#instructionsDialog");
  const text = doc.querySelector("#fullInstructionText");
  if (!dialog.open) dialog.showModal();
  const rect = dialog.getBoundingClientRect();
  const viewportWidth = doc.documentElement.clientWidth;
  const viewportHeight = doc.documentElement.clientHeight;

  if (rect.left < -1 || rect.right > viewportWidth + 1) {
    failures.push({
      id: card.id, numero: card.numero ?? null, categoria: card.familia,
      modalidad: card.modalidad, variante: card.variante,
      resolucion: `${resolution[0]}x${resolution[1]}`, cara: "modal",
      tipo: "modal-horizontal-overflow", elementos: ["instructionsDialog"]
    });
  }
  if (rect.height > viewportHeight + 1 || text.scrollWidth > text.clientWidth + 2) {
    failures.push({
      id: card.id, numero: card.numero ?? null, categoria: card.familia,
      modalidad: card.modalidad, variante: card.variante,
      resolucion: `${resolution[0]}x${resolution[1]}`, cara: "modal",
      tipo: "modal-overflow", elementos: ["instructionsDialog", "fullInstructionText"]
    });
  }
  dialog.close();
}

async function runAudit() {
  const cards = (await Promise.all(
    DATA_FILES.map((path) => fetch(path).then((response) => response.json()))
  )).flat();

  await waitFor(() => {
    const win = frame.contentWindow;
    return win?.document?.querySelector("#loadingMessage")?.textContent === "Elige un color";
  });

  const failures = [];
  const modalSamples = new Set();
  let evaluatedFaces = 0;

  for (const resolution of RESOLUTIONS) {
    frame.style.width = `${resolution[0]}px`;
    frame.style.height = `${resolution[1]}px`;
    frame.width = resolution[0];
    frame.height = resolution[1];
    await nextFrame(window);

    const win = frame.contentWindow;
    const doc = win.document;
    win.showCardScreen();

    for (const card of cards) {
      win.renderCard(card);
      win.updateCardHeight();

      doc.querySelector("#flipCard").classList.remove("is-flipped");
      auditFace({ card, resolution, faceName: "front", doc, failures });
      evaluatedFaces += 1;

      doc.querySelector("#flipCard").classList.add("is-flipped");
      auditFace({ card, resolution, faceName: "back", doc, failures });
      evaluatedFaces += 1;

      const modalKey = `${resolution.join("x")}:${card.modalidad}:${card.variante}`;
      if (!modalSamples.has(modalKey)) {
        modalSamples.add(modalKey);
        await auditModal({ card, resolution, doc, failures });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    cards: cards.length,
    resolutions: RESOLUTIONS.map(([width, height]) => `${width}x${height}`),
    renders: cards.length * RESOLUTIONS.length,
    evaluatedFaces,
    modalChecks: modalSamples.size,
    failureCount: failures.length,
    failures
  };

  resultNode.textContent = JSON.stringify(report);
  document.body.dataset.complete = "true";
  document.title = `AUDIT_COMPLETE_${failures.length}`;
  fetch("http://127.0.0.1:8765/report", {
    method: "POST",
    mode: "no-cors",
    body: encodeReport(report)
  }).catch(() => {});
}

runAudit().catch((error) => {
  const report = {
    fatalError: error.message,
    stack: error.stack
  };
  resultNode.textContent = JSON.stringify(report);
  document.body.dataset.complete = "error";
  document.title = "AUDIT_ERROR";
  fetch("http://127.0.0.1:8765/report", {
    method: "POST",
    mode: "no-cors",
    body: encodeReport(report)
  }).catch(() => {});
});
