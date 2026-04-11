// Edytuj tutaj nazwę klucza localStorage, jeśli chcesz trzymać dane pod innym identyfikatorem.
const STORAGE_KEY = "mgb-progress-tracker-v1";
const MONTHLY_TABLE_KEY = "mgb-manual-monthly-table-v1";
const OBWODY_KEY = "mgb-obwody-tracker-v1";
const PUBLISHED_PROGRESS_URL = "published-progress.json";

// Najważniejsze teksty interfejsu do ręcznej edycji.
const APP_TEXT = {
  emptyStateTitle: "Brak wpisów",
  emptyStateDescription:
    "Dodaj pierwszy pomiar, aby zobaczyć historię i porównać ją z prognozą.",
  noNote: "Bez notatki",
  chartTargetLabel: "Pomarańczowy: prognoza MGB",
  chartActualLabel: "Zielony: Twoje wpisy",
  monthLabel: "Miesiąc",
  rangeLabel: "Zakres",
  noMonthlyEntry: "—",
  startMonthLabel: "Start",
};

// Założenia modelu prognozy. Tu możesz ręcznie zmienić liczby dla 6 i 12 miesięcy.
const assumptions = {
  sixMonths: { low: 0.23, base: 0.275, high: 0.31 },
  twelveMonths: { low: 0.32, base: 0.368, high: 0.4 },
};

const calculatorForm = document.querySelector("#calculatorForm");
const entryForm = document.querySelector("#entryForm");
const clearEntriesButton = document.querySelector("#clearEntries");
const exportMonthlyTableButton = document.querySelector("#exportMonthlyTable");
const resetMonthlyTableButton = document.querySelector("#resetMonthlyTable");
const preparePublishDataButton = document.querySelector("#preparePublishData");

const startWeightInput = document.querySelector("#startWeight");
const surgeryDateInput = document.querySelector("#surgeryDate");
const entryDateInput = document.querySelector("#entryDate");
const entryWeightInput = document.querySelector("#entryWeight");
const entryNoteInput = document.querySelector("#entryNote");

const bmiWeightInput = document.querySelector("#bmiWeight");
const bmiHeightInput = document.querySelector("#bmiHeight");
const bmiValue = document.querySelector("#bmiValue");
const bmiCategory = document.querySelector("#bmiCategory");
const bmiDescription = document.querySelector("#bmiDescription");

const heroStartWeight = document.querySelector("#heroStartWeight");
const todayWeight = document.querySelector("#todayWeight");
const weight6m = document.querySelector("#weight6m");
const loss6m = document.querySelector("#loss6m");
const range6m = document.querySelector("#range6m");
const weight12m = document.querySelector("#weight12m");
const loss12m = document.querySelector("#loss12m");
const range12m = document.querySelector("#range12m");
const timeline6m = document.querySelector("#timeline6m");
const timeline12m = document.querySelector("#timeline12m");
const month6Label = document.querySelector("#month6Label");
const month12Label = document.querySelector("#month12Label");
const monthlyGoals = document.querySelector("#monthlyGoals");

const latestWeight = document.querySelector("#latestWeight");
const deltaFromStart = document.querySelector("#deltaFromStart");
const gapToYear = document.querySelector("#gapToYear");
const entryList = document.querySelector("#entryList");
const monthlyProgressBody = document.querySelector("#monthlyProgressBody");
const publicSnapshot = document.querySelector("#publicSnapshot");
const publishStatus = document.querySelector("#publishStatus");
const chartCanvas = document.querySelector("#progressChart");
const chartContext = chartCanvas.getContext("2d");

// Nowe dla obwodów
const obwodyForm = document.querySelector("#obwodyForm");
const obwodyDateInput = document.querySelector("#obwodyDate");
const obwodyTaliaInput = document.querySelector("#obwodyTalia");
const obwodyBiodraInput = document.querySelector("#obwodyBiodra");
const obwodyRamieInput = document.querySelector("#obwodyRamie");
const obwodyUdaInput = document.querySelector("#obwodyUda");
const obwodyNoteInput = document.querySelector("#obwodyNote");
const obwodyList = document.querySelector("#obwodyList");
const exportObwodyPDFButton = document.querySelector("#exportObwodyPDF");

// Nawigacja
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section");

// Formatuje wagę jako tekst, np. "94.3 kg".
function formatKg(value) {
  return `${value.toFixed(1)} kg`;
}

// Formatuje zmianę wagi ze znakiem plus/minus.
function formatSignedKg(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)} kg`;
}

function getBMICategory(bmi) {
  if (bmi < 18.5) {
    return {
      label: "Niedowaga",
      note: "Warto skonsultować dietę i aktywność fizyczną.",
    };
  }
  if (bmi < 25) {
    return {
      label: "Prawidłowa masa ciała",
      note: "Dobra kondycja dla mężczyzny, warto utrzymać aktywność.",
    };
  }
  if (bmi < 30) {
    return {
      label: "Nadwaga",
      note: "Warto kontynuować redukcję masy i obserwować postępy.",
    };
  }
  if (bmi < 35) {
    return {
      label: "Otyłość I stopnia",
      note: "Rzetelne monitorowanie i wsparcie medyczne są zalecane.",
    };
  }
  if (bmi < 40) {
    return {
      label: "Otyłość II stopnia",
      note: "Konieczne jest dalsze wsparcie specjalistyczne i kontrola żywienia.",
    };
  }

  return {
    label: "Otyłość III stopnia",
    note: "To najwyższy stopień otyłości; skonsultuj się z lekarzem.",
  };
}

function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  return heightM > 0 ? weightKg / (heightM * heightM) : 0;
}

function updateBMI() {
  if (!bmiWeightInput || !bmiHeightInput) {
    return;
  }

  const weight = Number(bmiWeightInput.value) || 0;
  const height = Number(bmiHeightInput.value) || 0;

  if (weight <= 0 || height <= 0) {
    bmiValue.textContent = "—";
    bmiCategory.textContent = "Podaj wagę i wzrost";
    bmiDescription.textContent = "BMI jest przydatnym wskaźnikiem przy odpowiedniej masie ciała i wzroście.";
    return;
  }

  const bmi = calculateBMI(weight, height);
  const rounded = bmi.toFixed(1);
  const category = getBMICategory(bmi);

  bmiValue.textContent = rounded;
  bmiCategory.textContent = category.label;
  bmiDescription.textContent = category.note;
}

function renderBMI(state) {
  if (!bmiWeightInput || !bmiHeightInput) {
    return;
  }

  if (!bmiWeightInput.value || Number(bmiWeightInput.value) === 0) {
    bmiWeightInput.value = state.startWeight || 130;
  }

  if (!bmiHeightInput.value || Number(bmiHeightInput.value) === 0) {
    bmiHeightInput.value = 170;
  }

  updateBMI();
}

// Formatuje datę pod polski zapis dzienny.
function formatDate(date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

// Zamienia obiekt Date na format YYYY-MM-DD dla pól formularza.
function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

// Dodaje pełne miesiące do wskazanej daty.
function addMonths(date, months) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

// Liczy wagę końcową i spadek masy dla zadanego %TWL.
function calculateProjection(startWeight, twlFraction) {
  const finalWeight = startWeight * (1 - twlFraction);
  const loss = startWeight - finalWeight;
  return { finalWeight, loss };
}

// Rozkłada cel roczny na cele miesięczne.
// Jeśli chcesz inny przebieg spadku, najłatwiej edytować tę funkcję.
function interpolateWeight(startWeight, month) {
  if (month <= 6) {
    const monthFraction = (assumptions.sixMonths.base / 6) * month;
    return calculateProjection(startWeight, monthFraction).finalWeight;
  }

  const twlAtSix = assumptions.sixMonths.base;
  const extraFraction =
    ((assumptions.twelveMonths.base - assumptions.sixMonths.base) / 6) * (month - 6);
  return calculateProjection(startWeight, twlAtSix + extraFraction).finalWeight;
}

// Pobiera aktualny stan aplikacji z localStorage.
function getState() {
  const fallback = {
    startWeight: 130,
    surgeryDate: isoDate(new Date()),
    entries: [],
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) {
      return fallback;
    }

    return {
      startWeight: Number(parsed.startWeight) || fallback.startWeight,
      surgeryDate: parsed.surgeryDate || fallback.surgeryDate,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return fallback;
  }
}

// Zapisuje cały stan aplikacji do localStorage.
function setState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

// Buduje ręczną tabelę do własnego uzupełniania od dnia operacji do 12 miesięcy dalej.
function buildManualMonthlyRows(surgeryDate) {
  const state = getState();
  const rows = [];

  for (let month = 0; month <= 12; month += 1) {
    const rowDate = addMonths(new Date(surgeryDate), month);
    rows.push({
      id: `month-${month}`,
      monthLabel: month === 0 ? APP_TEXT.startMonthLabel : `${APP_TEXT.monthLabel} ${month}`,
      date: isoDate(rowDate),
      weight: month === 0 ? String(state.startWeight || 130) : "",
      note: "",
    });
  }

  return rows;
}

// Pobiera ręczną tabelę miesięczną z localStorage albo odtwarza ją od nowa.
function getManualMonthlyTable(state) {
  try {
    const parsed = JSON.parse(localStorage.getItem(MONTHLY_TABLE_KEY));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return syncManualTableStartRow(parsed, state);
    }
  } catch {
    // Przy błędnym zapisie odbudowujemy tabelę od nowa.
  }

  return buildManualMonthlyRows(state.surgeryDate);
}

// Zapisuje ręcznie edytowalną tabelę miesięczną.
function setManualMonthlyTable(rows) {
  localStorage.setItem(MONTHLY_TABLE_KEY, JSON.stringify(rows));
}

// Aktualizuje pierwszy wiersz tabeli do bieżącej daty operacji i wagi startowej.
function syncManualTableStartRow(rows, state) {
  return rows.map((row, index) => {
    if (index !== 0) {
      return row;
    }

    return {
      ...row,
      date: state.surgeryDate,
      weight: row.weight || String(state.startWeight || 130),
    };
  });
}

// Sprawdza, czy tabela ręczna pasuje do aktualnej daty operacji.
function manualTableMatchesSurgeryDate(rows, surgeryDate) {
  if (!Array.isArray(rows) || rows.length !== 13) {
    return false;
  }

  return rows[0]?.date === surgeryDate;
}

// Sortuje wpisy rosnąco po dacie.
function getSortedEntries(entries) {
  return [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Buduje tekst zakresu prognozy z widełkami ostrożny/ambitny.
function projectionRangeText(startWeight, range) {
  const low = calculateProjection(startWeight, range.high).finalWeight;
  const high = calculateProjection(startWeight, range.low).finalWeight;
  return `${APP_TEXT.rangeLabel}: ${formatKg(low)}-${formatKg(high)}`;
}

// Buduje dane do publicznej publikacji na stronie.
function buildPublishedPayload(state) {
  const entries = getSortedEntries(state.entries);
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const recentEntries = entries.slice(-6).reverse();
  const monthlyTable = getManualMonthlyTable(state).map((row) => ({
    monthLabel: row.monthLabel,
    date: row.date,
    weight: row.weight,
    note: row.note,
  }));

  return {
    generatedAt: isoDate(new Date()),
    startWeight: Number(state.startWeight),
    surgeryDate: state.surgeryDate,
    latestEntry,
    recentEntries,
    monthlyTable,
  };
}

// Renderuje publiczny snapshot widoczny dla wszystkich po opublikowaniu pliku JSON.
function renderPublicSnapshot(data) {
  if (!data || (!data.latestEntry && (!data.recentEntries || data.recentEntries.length === 0))) {
    publicSnapshot.innerHTML =
      '<div class="public-snapshot-empty">Brak opublikowanego snapshotu. Po wygenerowaniu pliku i pushu będzie widoczny tutaj.</div>';
    return;
  }

  const latestWeightValue = data.latestEntry ? formatKg(Number(data.latestEntry.weight)) : "Brak";
  const latestDateValue = data.latestEntry ? formatDate(new Date(data.latestEntry.date)) : "Brak";
  const deltaValue = data.latestEntry
    ? formatSignedKg(Number(data.latestEntry.weight) - Number(data.startWeight))
    : "-";

  const recentList = (data.recentEntries || [])
    .map(
      (entry) => `
        <li>
          <strong>${formatKg(Number(entry.weight))}</strong>
          <small>${formatDate(new Date(entry.date))}${entry.note ? ` · ${entry.note}` : ""}</small>
        </li>
      `
    )
    .join("");

  publicSnapshot.innerHTML = `
    <p class="section-label">Widok publiczny</p>
    <h3>Ostatnio opublikowany progres</h3>
    <div class="public-snapshot-grid">
      <div class="snapshot-box">
        <span>Ostatnia waga</span>
        <strong>${latestWeightValue}</strong>
      </div>
      <div class="snapshot-box">
        <span>Data wpisu</span>
        <strong>${latestDateValue}</strong>
      </div>
      <div class="snapshot-box">
        <span>Zmiana od startu</span>
        <strong>${deltaValue}</strong>
      </div>
    </div>
    <ul class="snapshot-list">${recentList}</ul>
  `;
}

// Pobiera dane obwodów z localStorage.
function getObwodyState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OBWODY_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Zapisuje dane obwodów do localStorage.
function setObwodyState(obwody) {
  localStorage.setItem(OBWODY_KEY, JSON.stringify(obwody));
}

// Sortuje obwody rosnąco po dacie.
function getSortedObwody(obwody) {
  return [...obwody].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Renderuje listę obwodów.
function renderObwody() {
  const obwody = getSortedObwody(getObwodyState()).reverse();
  obwodyList.innerHTML = "";

  if (obwody.length === 0) {
    obwodyList.innerHTML = `<div class="entry-item"><div class="entry-main"><strong>Brak wpisów obwodów</strong><span class="entry-note">Dodaj pierwszy pomiar obwodów ciała.</span></div></div>`;
    return;
  }

  obwody.forEach((entry) => {
    const wrapper = document.createElement("div");
    wrapper.className = "obwody-item";
    wrapper.innerHTML = `
      <div class="obwody-item-meta">${formatDate(new Date(entry.date))}</div>
      <div class="obwody-item-values">
        <span>Talia: ${entry.talia || "—"} cm</span>
        <span>Biodra: ${entry.biodra || "—"} cm</span>
        <span>Ramię: ${entry.ramie || "—"} cm</span>
        <span>Uda: ${entry.uda || "—"} cm</span>
      </div>
      <div class="obwody-item-note">${entry.note || APP_TEXT.noNote}</div>
      <button class="obwody-delete" type="button" data-id="${entry.id}">Usuń</button>
    `;
    obwodyList.appendChild(wrapper);
  });
}

// Dodaje nowy wpis obwodów.
function addObwodyEntry(entry) {
  const obwody = getObwodyState();
  obwody.push(entry);
  setObwodyState(obwody);
  renderObwody();
}

// Usuwa wpis obwodów.
function removeObwodyEntry(id) {
  const obwody = getObwodyState().filter((entry) => entry.id !== id);
  setObwodyState(obwody);
  renderObwody();
}

// Eksportuje obwody do PDF.
function exportObwodyToPDF() {
  // Prosta implementacja - można użyć biblioteki jak jsPDF, ale na razie alert
  alert("Eksport do PDF wymaga dodatkowej biblioteki. Na razie dane są w localStorage.");
}

// Nawigacja między sekcjami.
function navigateToSection(sectionId) {
  sections.forEach((section) => section.classList.remove("active"));
  navLinks.forEach((link) => link.classList.remove("active"));

  const targetSection = document.querySelector(`#${sectionId}`);
  const targetLink = document.querySelector(`[data-section="${sectionId}"]`);

  if (targetSection) targetSection.classList.add("active");
  if (targetLink) targetLink.classList.add("active");

  // Scroll to top
  window.scrollTo(0, 0);
}

// Inicjalizuje nawigację.
function initNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.getAttribute("data-section");
      navigateToSection(section);
      // Update URL hash
      window.location.hash = section;
    });
  });

  // Handle initial load and hash changes
  const hash = window.location.hash.slice(1) || "home";
  navigateToSection(hash);

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1) || "home";
    navigateToSection(hash);
  });
}

// Renderuje główny kalkulator, podsumowania i cele miesięczne.
function renderCalculator(state) {
  const startWeight = Number(state.startWeight);
  const surgeryDate = new Date(state.surgeryDate);

  const sixBase = calculateProjection(startWeight, assumptions.sixMonths.base);
  const twelveBase = calculateProjection(startWeight, assumptions.twelveMonths.base);

  heroStartWeight.textContent = formatKg(startWeight);
  todayWeight.textContent = formatKg(startWeight);

  weight6m.textContent = formatKg(sixBase.finalWeight);
  loss6m.textContent = formatSignedKg(-sixBase.loss);
  range6m.textContent = projectionRangeText(startWeight, assumptions.sixMonths);

  weight12m.textContent = formatKg(twelveBase.finalWeight);
  loss12m.textContent = formatSignedKg(-twelveBase.loss);
  range12m.textContent = projectionRangeText(startWeight, assumptions.twelveMonths);

  timeline6m.textContent = formatKg(sixBase.finalWeight);
  timeline12m.textContent = formatKg(twelveBase.finalWeight);

  month6Label.textContent = formatDate(addMonths(surgeryDate, 6));
  month12Label.textContent = formatDate(addMonths(surgeryDate, 12));

  renderBMI(state);

  if (monthlyGoals) {
    monthlyGoals.innerHTML = "";
    for (let month = 1; month <= 12; month += 1) {
      const item = document.createElement("div");
      item.className = "goal-item";
      item.innerHTML = `
        <span>${APP_TEXT.monthLabel} ${month} · ${formatDate(addMonths(surgeryDate, month))}</span>
        <strong>${formatKg(interpolateWeight(startWeight, month))}</strong>
      `;
      monthlyGoals.appendChild(item);
    }
  }
}

// Tworzy punkty referencyjne prognozy do wykresu.
function buildProjectionPoints(state) {
  const startDate = new Date(state.surgeryDate);
  return [
    { date: startDate, weight: Number(state.startWeight), type: "target" },
    {
      date: addMonths(startDate, 6),
      weight: calculateProjection(Number(state.startWeight), assumptions.sixMonths.base).finalWeight,
      type: "target",
    },
    {
      date: addMonths(startDate, 12),
      weight: calculateProjection(Number(state.startWeight), assumptions.twelveMonths.base).finalWeight,
      type: "target",
    },
  ];
}

// Tworzy zakres prognozy dla 6 i 12 miesięcy: dolna i górna granica.
function buildProjectionRangePoints(state) {
  const startDate = new Date(state.surgeryDate);
  const startWeight = Number(state.startWeight);
  const low6 = calculateProjection(startWeight, assumptions.sixMonths.high).finalWeight;
  const high6 = calculateProjection(startWeight, assumptions.sixMonths.low).finalWeight;
  const low12 = calculateProjection(startWeight, assumptions.twelveMonths.high).finalWeight;
  const high12 = calculateProjection(startWeight, assumptions.twelveMonths.low).finalWeight;

  return [
    { date: startDate, low: startWeight, high: startWeight },
    { date: addMonths(startDate, 6), low: low6, high: high6 },
    { date: addMonths(startDate, 12), low: low12, high: high12 },
  ];
}

// Renderuje pustą, ręcznie edytowalną tabelę miesiąc po miesiącu.
function renderMonthlyProgressTable(state) {
  const rows = syncManualTableStartRow(getManualMonthlyTable(state), state);
  setManualMonthlyTable(rows);

  monthlyProgressBody.innerHTML = "";

  rows.forEach((tableRow) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tableRow.monthLabel}</td>
      <td>${formatDate(new Date(tableRow.date))}</td>
      <td>
        <input
          class="monthly-input"
          type="number"
          step="0.1"
          placeholder="np. 124.0"
          value="${tableRow.weight}"
          data-id="${tableRow.id}"
          data-field="weight"
        />
      </td>
      <td>
        <input
          class="monthly-input monthly-note-input"
          type="text"
          maxlength="120"
          placeholder="Twoja notatka"
          value="${tableRow.note}"
          data-id="${tableRow.id}"
          data-field="note"
        />
      </td>
    `;
    monthlyProgressBody.appendChild(row);
  });
}

// Rysuje wykres canvas: linia prognozy i linia realnych wpisów.
// Jeśli chcesz zmienić wygląd wykresu, kolory i podpisy edytuj tutaj.
function drawChart(state) {
  const entries = getSortedEntries(state.entries);
  const targetPoints = buildProjectionPoints(state);
  const allPoints = [...entries.map((entry) => ({ date: new Date(entry.date), weight: entry.weight, type: "actual" })), ...targetPoints];

  chartContext.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

  const padding = { top: 28, right: 26, bottom: 44, left: 54 };
  const width = chartCanvas.width - padding.left - padding.right;
  const height = chartCanvas.height - padding.top - padding.bottom;

  const minDate = Math.min(...allPoints.map((point) => point.date.getTime()));
  const maxDate = Math.max(...allPoints.map((point) => point.date.getTime()));
  const minWeight = Math.min(...allPoints.map((point) => point.weight)) - 4;
  const maxWeight = Math.max(...allPoints.map((point) => point.weight)) + 4;

  const x = (time) => padding.left + ((time - minDate) / Math.max(maxDate - minDate, 1)) * width;
  const y = (weight) => padding.top + ((maxWeight - weight) / Math.max(maxWeight - minWeight, 1)) * height;

  chartContext.strokeStyle = "rgba(78, 54, 33, 0.12)";
  chartContext.lineWidth = 1;
  chartContext.font = "12px Outfit";
  chartContext.fillStyle = "#6d5a49";

  for (let step = 0; step <= 4; step += 1) {
    const value = minWeight + ((maxWeight - minWeight) / 4) * step;
    const yPos = y(value);
    chartContext.beginPath();
    chartContext.moveTo(padding.left, yPos);
    chartContext.lineTo(chartCanvas.width - padding.right, yPos);
    chartContext.stroke();
    chartContext.fillText(formatKg(value), 8, yPos + 4);
  }

  const labelDates = [targetPoints[0], targetPoints[1], targetPoints[2]];
  labelDates.forEach((point) => {
    chartContext.fillText(
      formatDate(point.date),
      x(point.date.getTime()) - 24,
      chartCanvas.height - 14
    );
  });

  const rangePoints = buildProjectionRangePoints(state);
  if (rangePoints.length > 1) {
    chartContext.beginPath();
    rangePoints.forEach((point, index) => {
      const px = x(point.date.getTime());
      const py = y(point.high);
      if (index === 0) {
        chartContext.moveTo(px, py);
      } else {
        chartContext.lineTo(px, py);
      }
    });
    rangePoints
      .slice()
      .reverse()
      .forEach((point) => {
        const px = x(point.date.getTime());
        const py = y(point.low);
        chartContext.lineTo(px, py);
      });
    chartContext.closePath();
    chartContext.fillStyle = "rgba(201, 111, 58, 0.16)";
    chartContext.fill();
  }

  chartContext.setLineDash([8, 8]);
  chartContext.strokeStyle = "#c96f3a";
  chartContext.lineWidth = 3;
  chartContext.beginPath();
  targetPoints.forEach((point, index) => {
    const px = x(point.date.getTime());
    const py = y(point.weight);
    if (index === 0) {
      chartContext.moveTo(px, py);
    } else {
      chartContext.lineTo(px, py);
    }
  });
  chartContext.stroke();
  chartContext.setLineDash([]);

  targetPoints.forEach((point) => {
    const px = x(point.date.getTime());
    const py = y(point.weight);
    chartContext.fillStyle = "#c96f3a";
    chartContext.beginPath();
    chartContext.arc(px, py, 5, 0, Math.PI * 2);
    chartContext.fill();
  });

  if (entries.length > 0) {
    chartContext.strokeStyle = "#23654c";
    chartContext.lineWidth = 3;
    chartContext.beginPath();
    entries.forEach((entry, index) => {
      const px = x(new Date(entry.date).getTime());
      const py = y(entry.weight);
      if (index === 0) {
        chartContext.moveTo(px, py);
      } else {
        chartContext.lineTo(px, py);
      }
    });
    chartContext.stroke();

    entries.forEach((entry) => {
      const px = x(new Date(entry.date).getTime());
      const py = y(entry.weight);
      chartContext.fillStyle = "#23654c";
      chartContext.beginPath();
      chartContext.arc(px, py, 4.5, 0, Math.PI * 2);
      chartContext.fill();
    });
  }

  chartContext.fillStyle = "#20160f";
  chartContext.font = '600 13px "Outfit"';
  chartContext.fillText(APP_TEXT.chartTargetLabel, padding.left, 16);
  chartContext.fillText(APP_TEXT.chartActualLabel, padding.left + 210, 16);
}

// Renderuje listę wpisów i statystyki trackera.
function renderEntries(state) {
  const entries = getSortedEntries(state.entries).reverse();
  entryList.innerHTML = "";

  if (entries.length === 0) {
    entryList.innerHTML = `<div class="entry-item"><div class="entry-main"><strong>${APP_TEXT.emptyStateTitle}</strong><span class="entry-note">${APP_TEXT.emptyStateDescription}</span></div></div>`;
    latestWeight.textContent = "Brak";
    deltaFromStart.textContent = formatSignedKg(0);
    gapToYear.textContent = "-";
    return;
  }

  const latest = entries[0];
  const yearTarget = calculateProjection(Number(state.startWeight), assumptions.twelveMonths.base).finalWeight;
  latestWeight.textContent = formatKg(latest.weight);
  deltaFromStart.textContent = formatSignedKg(latest.weight - Number(state.startWeight));
  gapToYear.textContent = formatSignedKg(latest.weight - yearTarget);

  entries.forEach((entry) => {
    const wrapper = document.createElement("div");
    wrapper.className = "entry-item";
    wrapper.innerHTML = `
      <div class="entry-main">
        <span class="entry-meta">${formatDate(new Date(entry.date))}</span>
        <strong class="entry-weight">${formatKg(entry.weight)}</strong>
        <span class="entry-note">${entry.note || APP_TEXT.noNote}</span>
      </div>
      <button class="entry-delete" type="button" data-id="${entry.id}">Usuń</button>
    `;
    entryList.appendChild(wrapper);
  });
}

// Odpala pełne odświeżenie widoku po zmianie danych.
function render() {
  const state = getState();
  startWeightInput.value = state.startWeight;
  surgeryDateInput.value = state.surgeryDate;

  renderCalculator(state);
  renderEntries(state);
  renderMonthlyProgressTable(state);
  drawChart(state);
}

// Aktualizuje kalkulator na żywo po zmianie pól formularza.
calculatorForm.addEventListener("input", () => {
  const nextState = getState();
  const previousSurgeryDate = nextState.surgeryDate;
  nextState.startWeight = Number(startWeightInput.value) || 130;
  nextState.surgeryDate = surgeryDateInput.value || "2026-04-21";
  setState(nextState);

  if (nextState.surgeryDate !== previousSurgeryDate) {
    setManualMonthlyTable(buildManualMonthlyRows(nextState.surgeryDate));
  }

  render();
});

if (bmiWeightInput && bmiHeightInput) {
  bmiWeightInput.addEventListener("input", updateBMI);
  bmiHeightInput.addEventListener("input", updateBMI);
}

// Dodaje nowy wpis do trackera.
entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const nextState = getState();
  const entry = {
    id: crypto.randomUUID(),
    date: entryDateInput.value,
    weight: Number(entryWeightInput.value),
    note: entryNoteInput.value.trim(),
  };

  nextState.entries.push(entry);
  setState(nextState);

  entryForm.reset();
  entryDateInput.value = isoDate(new Date());
  render();
});

// Usuwa pojedynczy wpis po kliknięciu przycisku.
entryList.addEventListener("click", (event) => {
  const button = event.target.closest(".entry-delete");
  if (!button) {
    return;
  }

  const nextState = getState();
  nextState.entries = nextState.entries.filter((entry) => entry.id !== button.dataset.id);
  setState(nextState);
  render();
});

// Czyści całą historię wpisów.
clearEntriesButton.addEventListener("click", () => {
  const nextState = getState();
  nextState.entries = [];
  setState(nextState);
  render();
});

// Ustawia wartości startowe przy pierwszym otwarciu strony.
function initDefaults() {
  const state = getState();
  state.surgeryDate = "2026-04-21";

  setState(state);
  const rows = getManualMonthlyTable(state);
  if (!manualTableMatchesSurgeryDate(rows, state.surgeryDate)) {
    setManualMonthlyTable(buildManualMonthlyRows(state.surgeryDate));
  } else {
    setManualMonthlyTable(rows);
  }
  entryDateInput.value = isoDate(new Date());
  obwodyDateInput.value = isoDate(new Date());
}

// Zapisuje każdą zmianę w ręcznej tabeli od razu po wpisaniu.
monthlyProgressBody.addEventListener("input", (event) => {
  const input = event.target.closest(".monthly-input");
  if (!input) {
    return;
  }

  const state = getState();
  const rows = getManualMonthlyTable(state).map((row) => {
    if (row.id !== input.dataset.id) {
      return row;
    }

    return {
      ...row,
      [input.dataset.field]: input.value,
    };
  });

  setManualMonthlyTable(rows);
});

// Resetuje tylko ręczną tabelę miesięczną.
resetMonthlyTableButton.addEventListener("click", () => {
  const state = getState();
  setManualMonthlyTable(buildManualMonthlyRows(state.surgeryDate));
  render();
});

// Eksportuje ręczną tabelę miesięczną do pliku CSV.
exportMonthlyTableButton.addEventListener("click", () => {
  const state = getState();
  const rows = getManualMonthlyTable(state);
  const csvLines = [
    ["Miesiąc", "Data", "Waga", "Notatka"].join(";"),
    ...rows.map((row) =>
      [
        row.monthLabel,
        formatDate(new Date(row.date)),
        row.weight,
        `"${(row.note || "").replaceAll('"', '""')}"`,
      ].join(";")
    ),
  ];

  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mgb-progres-miesieczny.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

// Przygotowuje plik JSON z bieżącymi lokalnymi danymi do ręcznej publikacji.
preparePublishDataButton.addEventListener("click", () => {
  const state = getState();
  const payload = buildPublishedPayload(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "published-progress.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  publishStatus.textContent =
    "Pobrano plik published-progress.json. Podmień nim plik w repo, zrób commit i push, a wszyscy zobaczą ten snapshot.";
});

// Dodaje nowy wpis do obwodów.
obwodyForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const entry = {
    id: crypto.randomUUID(),
    date: obwodyDateInput.value,
    talia: Number(obwodyTaliaInput.value) || null,
    biodra: Number(obwodyBiodraInput.value) || null,
    ramie: Number(obwodyRamieInput.value) || null,
    uda: Number(obwodyUdaInput.value) || null,
    note: obwodyNoteInput.value.trim(),
  };

  addObwodyEntry(entry);
  obwodyForm.reset();
  obwodyDateInput.value = isoDate(new Date());
});

// Usuwa wpis obwodów.
obwodyList.addEventListener("click", (event) => {
  const button = event.target.closest(".obwody-delete");
  if (!button) return;

  removeObwodyEntry(button.dataset.id);
});

// Eksport obwodów do PDF.
exportObwodyPDFButton.addEventListener("click", exportObwodyToPDF);

// Reordering kafelków
const CARD_ORDER_KEY = "mgb-card-order-v1";

function getHomeCards() {
  const homeSection = document.querySelector("#home");
  return Array.from(homeSection.querySelectorAll("[data-card-id]"));
}

function getCardOrder() {
  try {
    const saved = localStorage.getItem(CARD_ORDER_KEY);
    return saved ? JSON.parse(saved) : ["bmi", "story", "calculator"];
  } catch {
    return ["bmi", "story", "calculator"];
  }
}

function saveCardOrder() {
  const cards = getHomeCards();
  const order = cards.map((card) => card.dataset.cardId);
  localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(order));
}

function reorderCards(order) {
  const homeSection = document.querySelector("#home");
  const cardMap = new Map();

  getHomeCards().forEach((card) => {
    cardMap.set(card.dataset.cardId, card);
  });

  const sortedCards = order
    .map((id) => cardMap.get(id))
    .filter((card) => card);

  sortedCards.forEach((card) => {
    homeSection.appendChild(card);
  });

  saveCardOrder();
}

function moveCard(cardId, direction) {
  const cards = getHomeCards();
  const order = cards.map((c) => c.dataset.cardId);
  const index = order.indexOf(cardId);

  if (direction === "up" && index > 0) {
    [order[index], order[index - 1]] = [order[index - 1], order[index]];
  } else if (direction === "down" && index < order.length - 1) {
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
  }

  reorderCards(order);
}

function initCardReordering() {
  const cards = getHomeCards();
  let draggedCard = null;

  // Load saved order
  const savedOrder = getCardOrder();
  reorderCards(savedOrder);

  // Drag and drop
  cards.forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      draggedCard = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", (e) => {
      draggedCard = null;
      card.classList.remove("dragging");
      document.querySelectorAll("[data-card-id]").forEach((c) => {
        c.classList.remove("drag-over");
      });
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (draggedCard && draggedCard !== card) {
        e.dataTransfer.dropEffect = "move";
        card.classList.add("drag-over");
      }
    });

    card.addEventListener("dragleave", (e) => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      if (draggedCard && draggedCard !== card) {
        const allCards = getHomeCards();
        const draggedIdx = allCards.indexOf(draggedCard);
        const targetIdx = allCards.indexOf(card);

        const homeSection = document.querySelector("#home");
        if (draggedIdx < targetIdx) {
          card.after(draggedCard);
        } else {
          card.before(draggedCard);
        }

        saveCardOrder();
      }
      card.classList.remove("drag-over");
    });
  });

  // Move buttons
  document.querySelectorAll(".card-move-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest("[data-card-id]");
      if (card) {
        moveCard(card.dataset.cardId, btn.dataset.direction);
      }
    });
  });
}

initDefaults();
render();
initCardReordering();
initNavigation();
renderObwody();
loadPublishedProgress();
