/* =========================================================
   APP.JS — reads the data, crunches it, draws the charts
   ---------------------------------------------------------
   STARTER VERSION. The function NAMES and DESCRIPTIONS are
   already written. In Step 4, Gemini fills in the bodies.

   The descriptions are a "contract": they tell the AI exactly
   what each function receives and returns, so everyone in
   class gets code that works the same way.

   RULE: do not rename functions or change their inputs.
   ========================================================= */


// Keeps track of the charts on screen so we can replace them on switch.
let categoryChart = null;
let trendChart = null;


/**
 * parseCsv(csvText)
 * Turns raw CSV text into an array of row objects.
 * Uses the PapaParse library (loaded in index.html).
 * Example: "Genre,Global_Sales\nSports,82.74" -> [{ Genre: "Sports", Global_Sales: "82.74" }]
 * @param {string} csvText - the full CSV text, header row first
 * @returns {Object[]} one object per data row
 */
function parseCsv(csvText) {
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true
  });
  return result.data;
}


/**
 * cleanRows(rows, settings)
 * Keeps only rows we can trust and counts the ones we threw away.
 * A row is SKIPPED when:
 *    - its category column is empty, or
 *    - its value column is not a number, or
 *    - its trend column is empty or "N/A".
 * @param {Object[]} rows - output of parseCsv
 * @param {Object} settings - one entry of DATASETS in config.js
 * @returns {{ clean: Object[], skipped: number }}
 */
function cleanRows(rows, settings) {
  const clean = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const catVal = row[settings.categoryColumn];
    const numVal = row[settings.valueColumn];
    const trendVal = row[settings.trendColumn];

    const isCategoryEmpty = catVal === undefined || catVal === null || String(catVal).trim() === "";
    const parsedNum = parseFloat(numVal);
    const isValueInvalid = numVal === undefined || numVal === null || String(numVal).trim() === "" || isNaN(parsedNum);
    const isTrendInvalid = trendVal === undefined || trendVal === null || String(trendVal).trim() === "" || String(trendVal).trim().toUpperCase() === "N/A";

    if (isCategoryEmpty || isValueInvalid || isTrendInvalid) {
      skipped++;
    } else {
      clean.push(row);
    }
  }

  return { clean: clean, skipped: skipped };
}


/**
 * toTrendKey(rawValue, grouping)
 * Converts a value from the trend column into the label used on the x-axis.
 *    "none"  -> unchanged              ("2006"      -> "2006")
 *    "hour"  -> hour from HH:MM        ("13:08"     -> "13:00")
 *    "month" -> YYYY-MM from M/D/YYYY  ("1/5/2019"  -> "2019-01")
 *    "year"  -> YYYY from M/D/YYYY     ("1/5/2019"  -> "2019")
 * @param {string} rawValue
 * @param {string} grouping - "none" | "hour" | "month" | "year"
 * @returns {string}
 */
function toTrendKey(rawValue, grouping) {
  const str = String(rawValue).trim();
  if (!grouping || grouping === "none") {
    return str;
  }

  if (grouping === "hour") {
    const parts = str.split(":");
    if (parts.length >= 1) {
      const hour = parts[0].padStart(2, "0");
      return hour + ":00";
    }
    return str;
  }

  if (grouping === "month" || grouping === "year") {
    let year = "";
    let month = "";

    if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3) {
        month = parts[0].padStart(2, "0");
        year = parts[2];
      }
    } else if (str.includes("-")) {
      const parts = str.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parts[0];
          month = parts[1].padStart(2, "0");
        } else {
          month = parts[0].padStart(2, "0");
          year = parts[2];
        }
      }
    }

    if (year && grouping === "year") {
      return year;
    }
    if (year && month && grouping === "month") {
      return year + "-" + month;
    }
    return str;
  }

  return str;
}


/**
 * groupAndAggregate(rows, groupColumn, valueColumn, aggregation, grouping)
 * Groups rows by one column and combines the numbers in each group.
 * Example: sum of "Total" per "Product line".
 * @param {Object[]} rows - cleaned rows
 * @param {string} groupColumn - column to group by
 * @param {string} valueColumn - column with the numbers
 * @param {string} aggregation - "sum" | "count" | "average"
 * @param {string} grouping - passed to toTrendKey ("none" for categories)
 * @returns {{ labels: string[], values: number[] }} in the order first seen
 */
function groupAndAggregate(rows, groupColumn, valueColumn, aggregation, grouping) {
  const groupOrder = [];
  const sums = {};
  const counts = {};

  for (let i = 0; i < rows.length; i++) {
    const rawGroup = rows[i][groupColumn];
    const key = toTrendKey(rawGroup, grouping);
    const num = parseFloat(rows[i][valueColumn]) || 0;

    if (!sums.hasOwnProperty(key)) {
      groupOrder.push(key);
      sums[key] = 0;
      counts[key] = 0;
    }

    sums[key] += num;
    counts[key] += 1;
  }

  const values = [];
  for (let i = 0; i < groupOrder.length; i++) {
    const key = groupOrder[i];
    if (aggregation === "count") {
      values.push(counts[key]);
    } else if (aggregation === "average") {
      values.push(counts[key] > 0 ? sums[key] / counts[key] : 0);
    } else {
      values.push(sums[key]);
    }
  }

  return { labels: groupOrder, values: values };
}


/**
 * sortGroups(groups, sortBy, limit)
 * Sorts grouped data and optionally keeps only the first few.
 * @param {{ labels: string[], values: number[] }} groups
 * @param {string} sortBy - "valueDesc" (biggest first) | "labelAsc" (A–Z / oldest first)
 * @param {number} [limit] - how many to keep (leave empty to keep all)
 * @returns {{ labels: string[], values: number[] }}
 */
function sortGroups(groups, sortBy, limit) {
  const combined = [];
  for (let i = 0; i < groups.labels.length; i++) {
    combined.push({
      label: groups.labels[i],
      value: groups.values[i]
    });
  }

  if (sortBy === "valueDesc") {
    combined.sort(function (a, b) {
      return b.value - a.value;
    });
  } else if (sortBy === "labelAsc") {
    combined.sort(function (a, b) {
      return String(a.label).localeCompare(String(b.label), undefined, { numeric: true, sensitivity: "base" });
    });
  }

  const result = typeof limit === "number" && limit > 0 ? combined.slice(0, limit) : combined;

  const labels = [];
  const values = [];
  for (let i = 0; i < result.length; i++) {
    labels.push(result[i].label);
    values.push(result[i].value);
  }

  return { labels: labels, values: values };
}


/**
 * formatNumber(value)
 * Formats a number with commas and CHART_SETTINGS.numberDecimals decimals.
 * Example: 322966.749 -> "322,966.75"
 */
function formatNumber(value) {
  const decimals = (typeof CHART_SETTINGS !== "undefined" && CHART_SETTINGS.numberDecimals !== undefined)
    ? CHART_SETTINGS.numberDecimals
    : 2;

  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}


/**
 * renderSummary(settings, cleanCount, skipped, total, topCategory)
 * Writes the dataset title, description and the 4 summary cards.
 * Required element IDs: dataset-title, dataset-description, dataset-source,
 * kpi-records, kpi-total, kpi-total-label, kpi-top, kpi-skipped
 */
function renderSummary(settings, cleanCount, skipped, total, topCategory) {
  const titleEl = document.getElementById("dataset-title");
  if (titleEl) titleEl.textContent = settings.title || "";

  const descEl = document.getElementById("dataset-description");
  if (descEl) descEl.textContent = settings.description || "";

  const sourceEl = document.getElementById("dataset-source");
  if (sourceEl) {
    sourceEl.href = settings.source || "#";
  }

  const kpiRecords = document.getElementById("kpi-records");
  if (kpiRecords) kpiRecords.textContent = Number(cleanCount).toLocaleString();

  const kpiTotalLabel = document.getElementById("kpi-total-label");
  if (kpiTotalLabel) kpiTotalLabel.textContent = settings.valueLabel || "Total";

  const kpiTotal = document.getElementById("kpi-total");
  if (kpiTotal) kpiTotal.textContent = formatNumber(total);

  const kpiTop = document.getElementById("kpi-top");
  if (kpiTop) kpiTop.textContent = topCategory || "-";

  const kpiSkipped = document.getElementById("kpi-skipped");
  if (kpiSkipped) kpiSkipped.textContent = Number(skipped).toLocaleString();
}


/**
 * renderCategoryChart(groups, settings)
 * Draws Chart 1 (bar chart) on <canvas id="chart-category">.
 * Destroys the previous chart first so switching datasets works.
 * Required element IDs: chart-category, chart-category-title
 */
function renderCategoryChart(groups, settings) {
  const titleEl = document.getElementById("chart-category-title");
  if (titleEl) {
    titleEl.textContent = (settings.valueLabel || "Value") + " by " + (settings.categoryColumn || "Category");
  }

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }

  const canvas = document.getElementById("chart-category");
  if (!canvas) return;

  const primary = (typeof CHART_SETTINGS !== "undefined" && CHART_SETTINGS.primaryColor) ? CHART_SETTINGS.primaryColor : "#0F766E";
  const chartType = (typeof CHART_SETTINGS !== "undefined" && CHART_SETTINGS.categoryChartType) ? CHART_SETTINGS.categoryChartType : "bar";

  categoryChart = new Chart(canvas, {
    type: chartType,
    data: {
      labels: groups.labels,
      datasets: [{
        label: settings.valueLabel || "Total",
        data: groups.values,
        backgroundColor: primary,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
}


/**
 * renderTrendChart(groups, settings)
 * Draws Chart 2 (line chart) on <canvas id="chart-trend">.
 * Destroys the previous chart first so switching datasets works.
 * Required element IDs: chart-trend, chart-trend-title
 */
function renderTrendChart(groups, settings) {
  const titleEl = document.getElementById("chart-trend-title");
  if (titleEl) {
    titleEl.textContent = (settings.valueLabel || "Value") + " by " + (settings.trendLabel || settings.trendColumn || "Trend");
  }

  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }

  const canvas = document.getElementById("chart-trend");
  if (!canvas) return;

  const primary = (typeof CHART_SETTINGS !== "undefined" && CHART_SETTINGS.primaryColor) ? CHART_SETTINGS.primaryColor : "#0F766E";
  const secondary = (typeof CHART_SETTINGS !== "undefined" && CHART_SETTINGS.secondaryColor) ? CHART_SETTINGS.secondaryColor : "rgba(153, 246, 228, 0.4)";
  const chartType = (typeof CHART_SETTINGS !== "undefined" && CHART_SETTINGS.trendChartType) ? CHART_SETTINGS.trendChartType : "line";

  trendChart = new Chart(canvas, {
    type: chartType,
    data: {
      labels: groups.labels,
      datasets: [{
        label: settings.valueLabel || "Trend",
        data: groups.values,
        borderColor: primary,
        backgroundColor: secondary,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
}


/**
 * loadDashboard(datasetKey)
 * The main function. Runs every step in order for one dataset:
 * parse -> clean -> group -> sort -> render summary -> render 2 charts.
 * @param {string} datasetKey - a key of DATASETS, e.g. "supermarket"
 */
function loadDashboard(datasetKey) {
  const settings = DATASETS[datasetKey];
  if (!settings) return;

  const parsed = parseCsv(settings.csv);
  const cleaned = cleanRows(parsed, settings);
  const rows = cleaned.clean;

  // Aggregate category groups
  const catGroups = groupAndAggregate(
    rows,
    settings.categoryColumn,
    settings.valueColumn,
    settings.aggregation,
    "none"
  );

  const maxCategories = (typeof CHART_SETTINGS !== "undefined" && CHART_SETTINGS.maxCategories) ? CHART_SETTINGS.maxCategories : 10;
  const sortedCatGroups = sortGroups(catGroups, "valueDesc", maxCategories);

  // Aggregate trend groups
  const trendGroups = groupAndAggregate(
    rows,
    settings.trendColumn,
    settings.valueColumn,
    settings.aggregation,
    settings.trendGrouping
  );
  const sortedTrendGroups = sortGroups(trendGroups, "labelAsc");

  // Calculate summary metrics
  let total = 0;
  if (settings.aggregation === "count") {
    total = rows.length;
  } else {
    for (let i = 0; i < rows.length; i++) {
      total += parseFloat(rows[i][settings.valueColumn]) || 0;
    }
    if (settings.aggregation === "average" && rows.length > 0) {
      total = total / rows.length;
    }
  }

  const topCategory = sortedCatGroups.labels.length > 0 ? sortedCatGroups.labels[0] : "-";

  renderSummary(settings, rows.length, cleaned.skipped, total, topCategory);
  renderCategoryChart(sortedCatGroups, settings);
  renderTrendChart(sortedTrendGroups, settings);
}


/**
 * setupDatasetPicker()
 * Fills <select id="dataset-select"> with every dataset in DATASETS,
 * selects ACTIVE_DATASET, and reloads the dashboard when it changes.
 */
function setupDatasetPicker() {
  const select = document.getElementById("dataset-select");
  if (!select) return;

  select.innerHTML = "";

  const keys = Object.keys(DATASETS);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const option = document.createElement("option");
    option.value = key;
    option.textContent = DATASETS[key].title || key;
    if (key === ACTIVE_DATASET) {
      option.selected = true;
    }
    select.appendChild(option);
  }

  select.addEventListener("change", function (event) {
    loadDashboard(event.target.value);
  });
}


// Start everything once the page has loaded.
document.addEventListener("DOMContentLoaded", function () {
  setupDatasetPicker();
  loadDashboard(ACTIVE_DATASET);
});
