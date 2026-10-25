"use strict";

const RATE = 0.90;
const MAX_DD_FIELDS = 50;

const caseConfig = {
  fresh: {
    title: "Fresh Case Details",
    description: "Enter the one-year DP and applicable charges.",
    badge: "FRESH",
    fields: [
      {
        id: "yearDP",
        label: "1 Year DP",
        placeholder: "Enter one-year DP amount"
      },
      {
        id: "charges",
        label: "Charges",
        placeholder: "Enter charges"
      }
    ]
  },

  enhancement: {
    title: "Enhancement Case Details",
    description: "Enter existing drawing power, one-year DP and charges.",
    badge: "ENHANCEMENT",
    fields: [
      {
        id: "drawingPower",
        label: "Drawing Power",
        placeholder: "Enter current drawing power"
      },
      {
        id: "yearDP",
        label: "1 Year DP",
        placeholder: "Enter one-year DP amount"
      },
      {
        id: "charges",
        label: "Charges",
        placeholder: "Enter charges"
      }
    ]
  },

  takeover: {
    title: "Takeover Case Details",
    description: "Add all DD amounts and enter applicable charges.",
    badge: "TAKEOVER",
    fields: [
      {
        id: "charges",
        label: "Charges",
        placeholder: "Enter charges"
      }
    ]
  }
};

let activeCase = "fresh";
let ddValues = [""];
let lastResults = null;

const form = document.getElementById("calculator-form");
const fieldsContainer = document.getElementById("fields-container");
const resultsContainer = document.getElementById("results-container");
const formError = document.getElementById("form-error");

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function fieldMarkup(field) {
  return `
    <div class="field">
      <label for="${field.id}">${field.label}</label>
      <div class="input-wrap">
        <span class="currency-symbol" aria-hidden="true">₹</span>
        <input
          id="${field.id}"
          name="${field.id}"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="${field.placeholder}"
          aria-describedby="${field.id}-error"
          required
        >
      </div>
      <div class="field-error" id="${field.id}-error"
        aria-live="polite"></div>
    </div>
  `;
}

function renderFields() {
  const config = caseConfig[activeCase];

  document.getElementById("form-title").textContent = config.title;
  document.getElementById("form-description").textContent =
    config.description;
  document.getElementById("case-badge").textContent = config.badge;

  fieldsContainer.innerHTML = config.fields.map(fieldMarkup).join("");

  if (activeCase === "takeover") {
    const ddSection = document.createElement("div");
    ddSection.className = "field";

    ddSection.innerHTML = `
      <div class="dd-heading">
        <label>DD Amounts</label>
        <span class="case-badge" id="dd-count">
          ${ddValues.length} DD
        </span>
      </div>
      <div id="dd-list"></div>
      <button type="button" class="add-dd" id="add-dd">
        + Add DD Amount
      </button>
      <div class="field-error" id="dd-error"
        role="alert" aria-live="polite"></div>
    `;

    fieldsContainer.insertBefore(ddSection, fieldsContainer.firstChild);
    renderDDFields();
  }

  formError.textContent = "";
}

function renderDDFields() {
  const list = document.getElementById("dd-list");

  if (!list) return;

  list.innerHTML = ddValues.map((value, index) => `
    <div class="dd-item">
      <div class="field">
        <label class="dd-label" for="dd-${index}">
          DD Amount ${index + 1}
        </label>

        <div class="input-wrap">
          <span class="currency-symbol" aria-hidden="true">₹</span>
          <input
            type="number"
            id="dd-${index}"
            name="dd-${index}"
            min="0"
            step="any"
            inputmode="decimal"
            placeholder="Enter DD amount"
            value="${escapeAttribute(value)}"
            required
            aria-describedby="dd-${index}-error"
          >
        </div>

        <div class="field-error" id="dd-${index}-error"
          aria-live="polite"></div>
      </div>

      <button type="button" class="remove-dd"
        data-remove-dd="${index}"
        aria-label="Remove DD amount ${index + 1}"
        title="Remove DD amount"
        ${ddValues.length === 1 ? "disabled" : ""}>×</button>
    </div>
  `).join("");

  document.getElementById("dd-count").textContent =
    `${ddValues.length} DD`;

  document.getElementById("add-dd").disabled =
    ddValues.length >= MAX_DD_FIELDS;

  document.getElementById("add-dd").title =
    ddValues.length >= MAX_DD_FIELDS
      ? `Maximum ${MAX_DD_FIELDS} DD fields allowed`
      : "Add another DD amount";
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clearResults() {
  lastResults = null;

  resultsContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">₹</div>
      <strong>Ready to calculate</strong>
      <p>
        Enter the required values and select Calculate DP
        to see your results.
      </p>
    </div>
  `;
}

function clearFieldErrors() {
  fieldsContainer.querySelectorAll(".field-error").forEach(el => {
    el.textContent = "";
  });

  fieldsContainer.querySelectorAll("[aria-invalid]").forEach(el => {
    el.removeAttribute("aria-invalid");
  });

  formError.textContent = "";
}

function showFieldError(input, message) {
  input.setAttribute("aria-invalid", "true");

  const error = document.getElementById(`${input.id}-error`);

  if (error) {
    error.textContent = message;
  }
}

function readAmount(id, label) {
  const input = document.getElementById(id);
  const raw = input.value.trim();

  if (raw === "") {
    showFieldError(input, `${label} is required.`);
    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    showFieldError(input, `Enter a valid ${label.toLowerCase()}.`);
    return null;
  }

  if (value < 0) {
    showFieldError(input, `${label} cannot be negative.`);
    return null;
  }

  return value;
}

function renderResults(cards) {
  resultsContainer.innerHTML = cards.map((card, index) => `
    <article class="result-card ${index === 0 ? "primary" : ""}">
      <div class="result-label">
        <span class="result-icon" aria-hidden="true">
          ${index === 0 ? "₹" : "✓"}
        </span>
        ${card.label}
      </div>

      <div class="result-value">${formatINR(card.value)}</div>
      <div class="result-formula">${card.formula}</div>
    </article>
  `).join("");
}

function calculate(event) {
  event.preventDefault();
  clearFieldErrors();

  const values = {};
  const config = caseConfig[activeCase];

  let valid = true;

  for (const field of config.fields) {
    const value = readAmount(field.id, field.label);

    if (value === null) {
      valid = false;
    } else {
      values[field.id] = value;
    }
  }

  let ddTotal = 0;

  if (activeCase === "takeover") {
    ddValues.forEach((_, index) => {
      const input = document.getElementById(`dd-${index}`);
      const raw = input.value.trim();
      const error = document.getElementById(`dd-${index}-error`);

      if (raw === "") {
        input.setAttribute("aria-invalid", "true");
        error.textContent = `DD Amount ${index + 1} is required.`;
        valid = false;
        return;
      }

      const value = Number(raw);

      if (!Number.isFinite(value) || value < 0) {
        input.setAttribute("aria-invalid", "true");
        error.textContent = "Enter a valid, non-negative amount.";
        valid = false;
        return;
      }

      ddTotal += value;

      if (!Number.isFinite(ddTotal)) {
        input.setAttribute("aria-invalid", "true");
        error.textContent = "The total DD amount is too large.";
        valid = false;
      }
    });
  }

  if (!valid) {
    formError.textContent =
      "Please correct the highlighted fields before calculating.";

    const firstInvalid = fieldsContainer.querySelector(
      '[aria-invalid="true"]'
    );

    if (firstInvalid) {
      firstInvalid.focus();
    }

    return;
  }

  let cards = [];

  // FRESH CASE
  if (activeCase === "fresh") {
    const dpAmount = values.yearDP * RATE;
    const amount = dpAmount + values.charges;

    cards = [
      {
        label: "DP Amount",
        value: dpAmount,
        formula: `1 Year DP × 90% = ${formatINR(values.yearDP)} × 90%`
      },
      {
        label: "Amount",
        value: amount,
        formula: `DP Amount + Charges = ${formatINR(dpAmount)} + ${formatINR(values.charges)}`
      }
    ];
  }

  // ENHANCEMENT CASE
  if (activeCase === "enhancement") {
    const difference = values.yearDP - values.drawingPower;
    const adjustedDP = difference * RATE;
    const newDPSet = adjustedDP + values.drawingPower;
    const amount = adjustedDP - values.charges;

    cards = [
      {
        label: "New DP Set",
        value: newDPSet,
        formula: `[(1 Year DP − Drawing Power) × 90%] + Drawing Power = [(${formatINR(values.yearDP)} − ${formatINR(values.drawingPower)}) × 90%] + ${formatINR(values.drawingPower)}`
      },
      {
        label: "Amount",
        value: amount,
        formula: `[(1 Year DP − Drawing Power) × 90%] − Charges = ${formatINR(adjustedDP)} − ${formatINR(values.charges)}`
      }
    ];
  }

  // TAKEOVER CASE
  if (activeCase === "takeover") {
    const dpAmount = ddTotal + values.charges;

    cards = [
      {
        label: "Amount",
        value: ddTotal,
        formula: `Sum of ${ddValues.length} DD amount(s)`
      },
      {
        label: "DP Amount",
        value: dpAmount,
        formula: `Sum of DD Amounts + Charges = ${formatINR(ddTotal)} + ${formatINR(values.charges)}`
      }
    ];
  }

  if (cards.some(card => !Number.isFinite(card.value))) {
    formError.textContent =
      "The result exceeds the supported numeric range. Check your inputs.";

    clearResults();
    return;
  }

  lastResults = {
    caseType: activeCase,
    cards
  };

  renderResults(cards);
}

function resetCalculator() {
  form.reset();
  ddValues = [""];

  clearFieldErrors();
  clearResults();
  renderFields();
}

// CASE TABS
document.querySelectorAll(".case-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    activeCase = tab.dataset.case;

    document.querySelectorAll(".case-tab").forEach(item => {
      const selected = item === tab;

      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });

    document.getElementById("case-form")
      .setAttribute("aria-labelledby", tab.id);

    ddValues = [""];

    clearResults();
    renderFields();
  });

  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const tabs = [...document.querySelectorAll(".case-tab")];
    const currentIndex = tabs.indexOf(tab);

    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  });
});

// ADD AND REMOVE DD AMOUNTS
fieldsContainer.addEventListener("click", event => {
  if (event.target.id === "add-dd") {
    if (ddValues.length >= MAX_DD_FIELDS) return;

    // Preserve entered values before rebuilding the DD fields.
    ddValues = ddValues.map((_, index) =>
      document.getElementById(`dd-${index}`).value
    );

    ddValues.push("");

    clearResults();
    renderDDFields();

    document.getElementById(`dd-${ddValues.length - 1}`).focus();
  }

  const removeButton = event.target.closest("[data-remove-dd]");

  if (removeButton) {
    if (ddValues.length <= 1) return;

    ddValues = ddValues.map((_, index) =>
      document.getElementById(`dd-${index}`).value
    );

    const removeIndex = Number(removeButton.dataset.removeDd);

    ddValues.splice(removeIndex, 1);

    clearResults();
    renderDDFields();
  }
});

// HANDLE INPUT CHANGES
fieldsContainer.addEventListener("input", event => {
  if (event.target.id.startsWith("dd-")) {
    const index = Number(event.target.id.slice(3));

    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < ddValues.length
    ) {
      ddValues[index] = event.target.value;
    }
  }

  // Clear old results when values change.
  if (lastResults) {
    clearResults();
  }
});

// CLEAR INDIVIDUAL FIELD ERRORS
fieldsContainer.addEventListener("change", event => {
  if (event.target.matches('input[type="number"]')) {
    const error = document.getElementById(`${event.target.id}-error`);

    if (error) {
      error.textContent = "";
    }

    event.target.removeAttribute("aria-invalid");
  }
});

// FORM SUBMIT AND RESET
form.addEventListener("submit", calculate);

document.getElementById("reset-btn")
  .addEventListener("click", resetCalculator);

// INITIALIZE CALCULATOR
renderFields();