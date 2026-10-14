/*
 * CSCE 679 — Level 1: Year × Month Temperature Heatmap
 * D3.js v7. To modify the chart, update CONFIG rather than embedded numbers.
 */
const CONFIG = {
    remoteCsvUrl: "https://raw.githubusercontent.com/xiameng552180/CSCE-679-Data-Visualization-Assignment1/main/temperature_daily.csv",
    localCsvUrl: "temperature_daily.csv",
    monthNames: d3.utcFormat("%B"),
    dateLabel: d3.utcFormat("%Y-%m-%d"),
    margins: { top: 56, right: 18, bottom: 15, left: 86 },
    chartWidth: 1220,
    cellHeight: 35,
    rowGap: 5,
    columnGap: 4,
    temperatureDomain: [0, 40],
    colorInterpolator: d3.interpolateYlOrRd,
    missingColor: "#edf0f4"
};

let dailyRecords = [];
let currentMetric = "max";
const tooltip = d3.select("#tooltip");
const colorScale = d3.scaleSequential(CONFIG.temperatureDomain, CONFIG.colorInterpolator).clamp(true);

// Parse CSV values once; UTC prevents timezone-dependent day/month shifts.
function parseTemperatureRow(row) {
    const date = d3.utcParse("%Y-%m-%d")(row.date);
    const max = row.max_temperature.trim() === "" ? NaN : Number(row.max_temperature);
    const min = row.min_temperature.trim() === "" ? NaN : Number(row.min_temperature);
    if (!date || (!Number.isFinite(max) && !Number.isFinite(min))) return null;
    return { date, year: date.getUTCFullYear(), month: date.getUTCMonth(), max, min };
}

// For each month, find the highest daily high and the lowest daily low.
// Store the actual day of each extreme to display in the tooltip.
function summarizeMonthlyExtremes(records) {
    return d3.rollups(
        records,
        days => {
            const validMax = days.filter(d => Number.isFinite(d.max));
            const validMin = days.filter(d => Number.isFinite(d.min));
            const maxDay = d3.greatest(validMax, d => d.max);
            const minDay = d3.least(validMin, d => d.min);
            return {
                max: maxDay ? maxDay.max : NaN,
                min: minDay ? minDay.min : NaN,
                maxDate: maxDay ? maxDay.date : null,
                minDate: minDay ? minDay.date : null,
                count: days.length
            };
        },
        d => d.year,
        d => d.month
    ).flatMap(([year, months]) => months.map(([month, extremes]) => ({ year, month, ...extremes })));
}

function buildTooltip(datum) {
    const isMax = currentMetric === "max";
    const value = datum[currentMetric];
    const extremeDate = datum[`${currentMetric}Date`];
    const monthName = CONFIG.monthNames(new Date(Date.UTC(2000, datum.month, 1)));
    const label = isMax ? "Highest daily maximum" : "Lowest daily minimum";
    return `<strong>${monthName} ${datum.year}</strong>
    <div>${label}: <b>${Number.isFinite(value) ? `${value} °C` : "No data"}</b></div>
    <div class="muted">Date: ${extremeDate ? CONFIG.dateLabel(extremeDate) : "Not available"}</div>
    <div class="muted">Days recorded: ${datum.count}</div>`;
}

function moveTooltip(event) {
  const padding = 16;
  const node = tooltip.node();
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const left = Math.max(8, Math.min(event.clientX + padding, window.innerWidth - width - 8));
  const top = Math.max(8, event.clientY - height - padding);
  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function drawLegend() {
  // Derive the legend stops from exactly the same scale used by the cells.
  const min = CONFIG.temperatureDomain[0];
  const max = CONFIG.temperatureDomain[1];
  const samples = d3.range(0, 101).map(i => colorScale(min + (max - min) * i / 100));
  d3.select(".legend-gradient").style("background", `linear-gradient(to right, ${samples.join(", ")})`);
  d3.select("#legend-ticks").selectAll("span")
    .data(d3.range(min, max + 1, 10))
    .join("span")
    .text(d => `${d}°`);
}

function drawHeatmap() {
  if (!dailyRecords.length) return;
  const monthly = summarizeMonthlyExtremes(dailyRecords);
  const years = d3.range(d3.min(dailyRecords, d => d.year), d3.max(dailyRecords, d => d.year) + 1);
  const months = d3.range(12);
  const { margins, chartWidth, cellHeight, rowGap, columnGap } = CONFIG;
  const innerWidth = chartWidth - margins.left - margins.right;
  const rowStep = cellHeight + rowGap;
  const totalHeight = margins.top + months.length * rowStep - rowGap + margins.bottom;
  const xScale = d3.scaleBand().domain(years).range([0, innerWidth]).paddingInner(columnGap / (innerWidth / years.length));
  const yScale = d3.scaleBand().domain(months).range([0, months.length * rowStep - rowGap]).paddingInner(rowGap / rowStep);

  // Join all 12 × number-of-years combinations, marking absent ones in gray.
  const byKey = new Map(monthly.map(d => [`${d.year}-${d.month}`, d]));
  const cells = years.flatMap(year => months.map(month =>
    byKey.get(`${year}-${month}`) ?? { year, month, max: NaN, min: NaN, count: 0, maxDate: null, minDate: null }
  ));

  d3.select("#chart").selectAll("svg").remove();
  const svg = d3.select("#chart").append("svg")
    .attr("class", "heatmap")
    .attr("viewBox", `0 0 ${chartWidth} ${totalHeight}`)
    .attr("role", "img")
    .attr("aria-label", `${currentMetric === "max" ? "Maximum" : "Minimum"} temperatures by month and year`);
  const root = svg.append("g").attr("transform", `translate(${margins.left},${margins.top})`);

  root.selectAll("text.year-label")
    .data(years).join("text").attr("class", "year-label")
    .attr("x", d => xScale(d) + xScale.bandwidth() / 2)
    .attr("y", -16).text(d => d);
  root.selectAll("text.month-label")
    .data(months).join("text").attr("class", "month-label")
    .attr("x", -12).attr("y", d => yScale(d) + yScale.bandwidth() / 2)
    .text(d => CONFIG.monthNames(new Date(Date.UTC(2000, d, 1))));

  root.selectAll("rect.heat-cell")
    .data(cells, d => `${d.year}-${d.month}`)
    .join("rect")
    .attr("class", d => Number.isFinite(d[currentMetric]) ? "heat-cell" : "heat-cell empty-cell")
    .attr("x", d => xScale(d.year))
    .attr("y", d => yScale(d.month))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", 1)
    .attr("fill", d => Number.isFinite(d[currentMetric]) ? colorScale(d[currentMetric]) : CONFIG.missingColor)
    .attr("tabindex", 0)
    .attr("role", "graphics-symbol")
    .attr("aria-label", d => `${CONFIG.monthNames(new Date(Date.UTC(2000, d.month, 1)))} ${d.year}: ${Number.isFinite(d[currentMetric]) ? d[currentMetric] + " degrees Celsius" : "no data"}`)
    .on("mouseenter focus", function(event, d) {
      tooltip.html(buildTooltip(d)).attr("hidden", null);
      if (event.type === "mouseenter") moveTooltip(event);
      else {
        const bounds = this.getBoundingClientRect();
        moveTooltip({clientX: bounds.left + bounds.width / 2, clientY: bounds.top});
      }
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave blur", () => tooltip.attr("hidden", true));

  d3.select("#chart-heading").text(`Monthly ${currentMetric === "max" ? "maximum" : "minimum"} temperature`);
  d3.select("#period-label").text(`${years[0]}–${years.at(-1)} · °C`);
  drawLegend();
}

function receiveCsvText(csvText) {
  const parsedRows = d3.csvParse(csvText, parseTemperatureRow).filter(Boolean);
  if (!parsedRows.length) throw new Error("The CSV did not contain valid daily temperatures.");
  dailyRecords = parsedRows;
  d3.select("#status").classed("error", false).text("");
  drawHeatmap();
}

async function loadData() {
  const status = d3.select("#status");
  for (const source of [CONFIG.localCsvUrl, CONFIG.remoteCsvUrl]) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      receiveCsvText(await response.text());
      return;
    } catch (error) {
      console.warn(`Could not load ${source}:`, error);
    }
  }
  status.classed("error", true).text("Couldn't load the CSV automatically. Download temperature_daily.csv and use ‘Load CSV from device’ above, or run a local HTTP server.");
}

d3.selectAll('input[name="metric"]').on("change", function() {
  currentMetric = this.value;
  tooltip.attr("hidden", true);
  drawHeatmap();
});

d3.select("#csv-file").on("change", async function() {
  const selectedFile = this.files?.[0];
  if (!selectedFile) return;
  try { receiveCsvText(await selectedFile.text()); }
  catch (error) { d3.select("#status").classed("error", true).text(error.message); }
});

loadData();