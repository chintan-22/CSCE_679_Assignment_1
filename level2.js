const CONFIG = {
    localCsvUrl: "temperature_daily.csv",
    remoteCsvUrl: "https://raw.githubusercontent.com/xiameng552180/CSCE-679-Data-Visualization-Assignment1/main/temperature_daily.csv",

    yearsToDisplay: 10,

    margins: {
        top: 45,
        right: 20,
        bottom: 20,
        left: 85
    },

    cellWidth: 118,
    cellHeight: 72,
    columnGap: 5,
    rowGap: 6,

    plotInset: {
        left: 5,
        right: 5,
        top: 7,
        bottom: 12
    },

    temperatureDomain: [0, 40],

    maxLineColor: "#a81d2c",
    minLineColor: "#1760a5",
    missingColor: "#edf0f4",

    colorInterpolator: d3.interpolateYlOrRd,

    dateLabel: d3.utcFormat("%Y-%m-%d"),
    monthLabel: d3.utcFormat("%B")
};

const tooltip = d3.select("#tooltip");

const backgroundColor = d3.scaleSequential(
    CONFIG.temperatureDomain,
    CONFIG.colorInterpolator
).clamp(true);

let dailyRecords = [];


/* ------------------------------------------
   1. Parse CSV data
------------------------------------------ */

function parseTemperatureRow(row) {
    const date = d3.utcParse("%Y-%m-%d")(row.date);

    const max = row.max_temperature.trim() === "" ?
        NaN :
        Number(row.max_temperature);

    const min = row.min_temperature.trim() === "" ?
        NaN :
        Number(row.min_temperature);

    if (!date) return null;

    if (!Number.isFinite(max) && !Number.isFinite(min)) {
        return null;
    }

    return {
        date: date,
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        max: max,
        min: min
    };
}


/* ------------------------------------------
   2. Group daily records by year and month
------------------------------------------ */

function groupMonthlyData(records) {
    return d3.rollups(
        records,

        days => {
            const sortedDays = days.slice().sort(
                (a, b) => a.date - b.date
            );

            const validValues = sortedDays.flatMap(day => {
                const values = [];

                if (Number.isFinite(day.max)) {
                    values.push(day.max);
                }

                if (Number.isFinite(day.min)) {
                    values.push(day.min);
                }

                return values;
            });

            return {
                days: sortedDays,
                meanTemperature: validValues.length ?
                    d3.mean(validValues) : NaN,
                count: sortedDays.length
            };
        },

        d => d.year,
        d => d.month

    ).flatMap(([year, months]) => {
        return months.map(([month, data]) => ({
            year: year,
            month: month,
            ...data
        }));
    });
}


/* ------------------------------------------
   3. Build tooltip content
------------------------------------------ */

function buildTooltip(monthData, dayData) {
    const monthName = CONFIG.monthLabel(
        new Date(Date.UTC(2000, monthData.month, 1))
    );

    if (!dayData) {
        return `
      <strong>${monthName} ${monthData.year}</strong>
      <div class="muted">No temperature data available</div>
    `;
    }

    const maxText = Number.isFinite(dayData.max) ?
        `${dayData.max} °C` :
        "No data";

    const minText = Number.isFinite(dayData.min) ?
        `${dayData.min} °C` :
        "No data";

    return `
    <strong>${CONFIG.dateLabel(dayData.date)}</strong>
    <div>Maximum: <b>${maxText}</b></div>
    <div>Minimum: <b>${minText}</b></div>
    <div class="muted">${monthName} ${monthData.year}</div>
  `;
}


/* ------------------------------------------
   4. Position tooltip near mouse
------------------------------------------ */

function moveTooltip(event) {
    const padding = 16;
    const node = tooltip.node();

    const tooltipWidth = node.offsetWidth;
    const tooltipHeight = node.offsetHeight;

    const left = Math.max(
        8,
        Math.min(
            event.clientX + padding,
            window.innerWidth - tooltipWidth - 8
        )
    );

    const top = Math.max(
        8,
        event.clientY - tooltipHeight - padding
    );

    tooltip
        .style("left", `${left}px`)
        .style("top", `${top}px`);
}


/* ------------------------------------------
   5. Draw temperature color legend
------------------------------------------ */

function drawLegend() {
    const min = CONFIG.temperatureDomain[0];
    const max = CONFIG.temperatureDomain[1];

    const samples = d3.range(101).map(index => {
        const value = min + (max - min) * index / 100;
        return backgroundColor(value);
    });

    d3.select(".legend-gradient")
        .style(
            "background",
            `linear-gradient(to right, ${samples.join(", ")})`
        );

    d3.select("#legend-ticks")
        .selectAll("span")
        .data(d3.range(min, max + 1, 10))
        .join("span")
        .text(value => `${value}°`);
}


/* ------------------------------------------
   6. Draw mini line charts inside each cell
------------------------------------------ */

function drawMiniChart(cellGroup, monthData) {
    if (!monthData.days || monthData.days.length === 0) {
        return;
    }

    const { cellWidth, cellHeight, plotInset } = CONFIG;

    const plotWidth =
        cellWidth - plotInset.left - plotInset.right;

    const plotHeight =
        cellHeight - plotInset.top - plotInset.bottom;

    // Horizontal position represents the day of the month.
    const xScale = d3.scaleLinear()
        .domain([1, 31])
        .range([0, plotWidth]);

    // Same temperature scale for all mini charts.
    const yScale = d3.scaleLinear()
        .domain(CONFIG.temperatureDomain)
        .range([plotHeight, 0]);

    const lineMax = d3.line()
        .defined(day => Number.isFinite(day.max))
        .x(day => xScale(day.day))
        .y(day => yScale(day.max));

    const lineMin = d3.line()
        .defined(day => Number.isFinite(day.min))
        .x(day => xScale(day.day))
        .y(day => yScale(day.min));

    const chartGroup = cellGroup.append("g")
        .attr(
            "transform",
            `translate(${plotInset.left},${plotInset.top})`
        );

    // Maximum temperature line.
    chartGroup.append("path")
        .datum(monthData.days)
        .attr("class", "max-line")
        .attr("fill", "none")
        .attr("stroke", CONFIG.maxLineColor)
        .attr("stroke-width", 1.8)
        .attr("d", lineMax);

    // Minimum temperature line.
    chartGroup.append("path")
        .datum(monthData.days)
        .attr("class", "min-line")
        .attr("fill", "none")
        .attr("stroke", CONFIG.minLineColor)
        .attr("stroke-width", 1.8)
        .attr("d", lineMin);

    // Transparent mouse-interaction area.
    chartGroup.append("rect")
        .attr("width", plotWidth)
        .attr("height", plotHeight)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mousemove", function(event) {
            const pointer = d3.pointer(event, this);
            const estimatedDay = xScale.invert(pointer[0]);

            // Find the recorded date nearest to the cursor.
            const nearestDay = d3.least(
                monthData.days,
                day => Math.abs(day.day - estimatedDay)
            );

            tooltip
                .html(buildTooltip(monthData, nearestDay))
                .attr("hidden", null);

            moveTooltip(event);
        })
        .on("mouseleave", function() {
            tooltip.attr("hidden", true);
        });
}


/* ------------------------------------------
   7. Draw complete Year × Month heatmap
------------------------------------------ */

function drawHeatmap() {
    if (!dailyRecords.length) return;

    const monthlyData = groupMonthlyData(dailyRecords);

    const lastYear = d3.max(dailyRecords, d => d.year);
    const firstYear = lastYear - CONFIG.yearsToDisplay + 1;

    const years = d3.range(firstYear, lastYear + 1);
    const months = d3.range(12);

    const {
        margins,
        cellWidth,
        cellHeight,
        columnGap,
        rowGap
    } = CONFIG;

    const columnStep = cellWidth + columnGap;
    const rowStep = cellHeight + rowGap;

    const chartWidth =
        margins.left +
        years.length * columnStep -
        columnGap +
        margins.right;

    const chartHeight =
        margins.top +
        months.length * rowStep -
        rowGap +
        margins.bottom;

    const monthlyLookup = new Map(
        monthlyData.map(data => [
            `${data.year}-${data.month}`,
            data
        ])
    );

    const cells = years.flatMap(year => {
        return months.map(month => {
            const key = `${year}-${month}`;

            return monthlyLookup.get(key) || {
                year: year,
                month: month,
                days: [],
                meanTemperature: NaN,
                count: 0
            };
        });
    });

    // Remove previous SVG before rendering.
    d3.select("#chart").selectAll("svg").remove();

    const svg = d3.select("#chart")
        .append("svg")
        .attr("class", "heatmap")
        .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
        .attr("role", "img")
        .attr(
            "aria-label",
            "Daily maximum and minimum temperatures by month and year"
        );

    const root = svg.append("g")
        .attr(
            "transform",
            `translate(${margins.left},${margins.top})`
        );

    // Draw year labels.
    root.selectAll(".year-label")
        .data(years)
        .join("text")
        .attr("class", "year-label")
        .attr(
            "x",
            (year, index) => index * columnStep + cellWidth / 2
        )
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .text(year => year);

    // Draw month labels.
    root.selectAll(".month-label")
        .data(months)
        .join("text")
        .attr("class", "month-label")
        .attr("x", -12)
        .attr(
            "y",
            (month, index) => index * rowStep + cellHeight / 2
        )
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .text(month => CONFIG.monthLabel(
            new Date(Date.UTC(2000, month, 1))
        ));

    // Create each monthly cell.
    const cellGroups = root.selectAll(".month-cell")
        .data(cells)
        .join("g")
        .attr("class", "month-cell")
        .attr("transform", data => {
            const column = data.year - firstYear;
            const row = data.month;

            return `translate(${column * columnStep},${row * rowStep})`;
        });

    // Draw background rectangles.
    cellGroups.append("rect")
        .attr("class", "cell-background")
        .attr("width", cellWidth)
        .attr("height", cellHeight)
        .attr("rx", 1)
        .attr("fill", data =>
            Number.isFinite(data.meanTemperature) ?
            backgroundColor(data.meanTemperature) :
            CONFIG.missingColor
        );

    // Add the daily maximum/minimum lines.
    cellGroups.each(function(data) {
        drawMiniChart(d3.select(this), data);
    });

    // Tooltip for missing cells and cell backgrounds.
    cellGroups.select(".cell-background")
        .on("mouseenter", function(event, data) {
            const monthName = CONFIG.monthLabel(
                new Date(Date.UTC(2000, data.month, 1))
            );

            const content = data.days.length ?
                `
          <strong>${monthName} ${data.year}</strong>
          <div>Monthly average:
            <b>${data.meanTemperature.toFixed(1)} °C</b>
          </div>
          <div class="muted">Days recorded: ${data.count}</div>
        ` :
                buildTooltip(data, null);

            tooltip.html(content).attr("hidden", null);
            moveTooltip(event);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave", function() {
            tooltip.attr("hidden", true);
        });

    d3.select("#chart-heading")
        .text("Daily maximum and minimum temperatures");

    d3.select("#period-label")
        .text(`${firstYear}–${lastYear} · °C`);

    drawLegend();
}


/* ------------------------------------------
   8. Process loaded CSV
------------------------------------------ */

function receiveCsvText(csvText) {
    const parsedRows = d3.csvParse(
        csvText,
        parseTemperatureRow
    ).filter(Boolean);

    if (!parsedRows.length) {
        throw new Error(
            "CSV does not contain valid temperature records."
        );
    }

    dailyRecords = parsedRows;

    d3.select("#status")
        .classed("error", false)
        .text("");

    drawHeatmap();
}


/* ------------------------------------------
   9. Load CSV from local file or GitHub
------------------------------------------ */

async function loadData() {
    const sources = [
        CONFIG.localCsvUrl,
        CONFIG.remoteCsvUrl
    ];

    for (const url of sources) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const csvText = await response.text();

            receiveCsvText(csvText);
            return;

        } catch (error) {
            console.warn(`Could not load ${url}:`, error);
        }
    }

    d3.select("#status")
        .classed("error", true)
        .text(
            "Could not load temperature data. Check that temperature_daily.csv is in the project folder."
        );
}


/* ------------------------------------------
   10. Manually upload CSV if necessary
------------------------------------------ */

d3.select("#csv-file").on("change", async function() {
    const selectedFile =
        this.files && this.files.length > 0 ?
        this.files[0] :
        null;

    if (!selectedFile) return;

    try {
        const csvText = await selectedFile.text();
        receiveCsvText(csvText);

    } catch (error) {
        d3.select("#status")
            .classed("error", true)
            .text(error.message);
    }
});


/* ------------------------------------------
   11. Initialize visualization
------------------------------------------ */

loadData();