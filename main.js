import "./style.css";
import * as d3 from "d3";
import polyclonal from "./data/polyclonal.json" assert { type: "json" };

// INITIALIZE THE DATA //

// Format the JSON for each antibody model
for (const selection in polyclonal) {
  // Get the map for reference sites to sequential sites
  const siteMap = polyclonal[selection].sitemap;
  // Add the epitopes information
  polyclonal[selection].epitopes = ["1"];
  polyclonal[selection].epitope_colors = { 1: "#0072B2" };
  polyclonal[selection].mut_escape_df = polyclonal[selection].mut_escape_df.map(
    (e) => {
      return {
        ...e,
        site: siteMap[e.site],
        site_reference: e.site,
        escape: e.escape_mean,
      };
    }
  );
}

// INITIALIZE DEFAULTS //

const models = Object.keys(polyclonal);
let model = models[0];
let epitope = polyclonal[model].epitopes[0];
let metric = "sum";
let floor = true;

// DEFINE FUNCTIONS //

// Function to update html selection with options
function updateSelection(selection, options) {
  selection.innerHTML = options
    .map((option) => `<option value="${option}">${option}</option>`)
    .join("");
}

// Function to summarize escape data
function summarizeEscapeData(data) {
  // Calculate summary stats for each site/epitope pair
  const escapeDataRollup = d3.rollup(
    data,
    (v) => {
      return {
        mean: d3.mean(v, (d) => d.escape),
        sum: d3.sum(v, (d) => d.escape),
        min: d3.min(v, (d) => d.escape),
        max: d3.max(v, (d) => d.escape),
      };
    },
    (d) => d.site,
    (d) => d.epitope
  );

  // Join the map of summarized escape back to the original
  const escapeDataSummary = data
    .map((e) => {
      return {
        epitope: e.epitope,
        site: e.site,
        wildtype: e.wildtype,
        ...escapeDataRollup.get(e.site).get(e.epitope),
      };
    })
    .filter(
      (element, index, self) =>
        index ===
        self.findIndex(
          (e) => e.site === element.site && e.epitope === element.epitope
        )
    );

  return escapeDataSummary;
}

// DOM SELECTIONS AND MANIPULATIONS //

// For each selection element, update with options
const modelSelection = document.getElementById("model");
updateSelection(modelSelection, models);
const epitopeSelection = document.getElementById("epitope");
updateSelection(epitopeSelection, polyclonal[models[0]].epitopes);
const metricSelection = document.getElementById("metric");
updateSelection(metricSelection, ["sum", "mean", "min", "max"]);

// Add event listener to update model
modelSelection.addEventListener("change", (event) => {
  model = event.target.value;
  const epitopes = polyclonal[model].epitopes;
  updateSelection(epitopeSelection, epitopes);
  epitopeSelection.dispatchEvent(new Event("change"));
});

// Add event listener to update epitope
epitopeSelection.addEventListener("change", (event) => {
  epitope = event.target.value;
});

// Add event listener to update summary metric
metricSelection.addEventListener("change", (event) => {
  metric = event.target.value;
});

// INITIALIZE THE PLOT //

function makePlot() {
  // Get the data
  const data = polyclonal[model].mut_escape_df;
  const escapeDataSummary = summarizeEscapeData(data).filter(
    (e) => e.epitope === epitope
  );

  // Relative scaling of plot elements
  const marginScale = {
    top: 0.025,
    left: 0.04,
    bottom: 0.1,
    right: 0.06,
    innerTop: 0.05,
    innerRight: 0.08,
    focusContextRatio: 0.15,
    focusHeatmapRatio: 0.03,
  };

  // Plot dimensions
  const dimensions = {
    width: document.getElementById("chart").offsetWidth,
    height: 400,
  };

  // Margins around the whole plot
  dimensions.margin = {
    top: dimensions.height * marginScale.top,
    left: dimensions.width * marginScale.left,
    bottom: dimensions.height * marginScale.bottom,
    right: dimensions.width * marginScale.right,
  };
  // Inner margins between plots
  dimensions.marginInner = {
    top: dimensions.height * marginScale.innerTop,
    right: dimensions.height * marginScale.innerRight,
  };
  // Bounded plot sizes
  dimensions.boundedContext = {
    height:
      (dimensions.height -
        dimensions.margin.top -
        dimensions.margin.bottom -
        dimensions.marginInner.top) *
      marginScale.focusContextRatio,
    width:
      (dimensions.width -
        dimensions.margin.right -
        dimensions.margin.left -
        dimensions.marginInner.right) *
      (1 - marginScale.focusHeatmapRatio),
  };
  dimensions.boundedFocus = {
    height:
      (dimensions.height -
        dimensions.margin.top -
        dimensions.margin.bottom -
        dimensions.marginInner.top) *
      (1 - marginScale.focusContextRatio),
    width:
      (dimensions.width -
        dimensions.margin.right -
        dimensions.margin.left -
        dimensions.marginInner.right) *
      (1 - marginScale.focusHeatmapRatio),
  };
  dimensions.boundedHeatmap = {
    height:
      dimensions.height - dimensions.margin.top - dimensions.margin.bottom,
    width:
      (dimensions.width -
        dimensions.margin.right -
        dimensions.margin.left -
        dimensions.marginInner.right) *
      marginScale.focusHeatmapRatio,
  };

  // Chart wrapper svg
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)
    .attr("class", "wrapper");

  // Create the bounds
  const bounds = svg
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  // Outer bounds of the wrapper element
  svg
    .append("rect")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)
    .attr("fill", "none")
    .attr("stroke-width", 4)
    .attr("stroke", "black")
    .attr("stroke-dasharray", 4);

  // Context plot location
  bounds
    .append("rect")
    .attr("width", dimensions.boundedContext.width)
    .attr("height", dimensions.boundedContext.height)
    .attr("fill", "#4287f5")
    .attr("fill-opacity", 0.2)
    .attr("stroke", "#4287f5")
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 1);

  // Focus plot location
  bounds
    .append("rect")
    .attr("width", dimensions.boundedFocus.width)
    .attr("height", dimensions.boundedFocus.height)
    .attr("y", dimensions.boundedContext.height + dimensions.marginInner.top)
    .attr("fill", "#48f542")
    .attr("fill-opacity", 0.2)
    .attr("stroke", "#48f542")
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 1);

  // Heatmap plot location
  bounds
    .append("rect")
    .attr("width", dimensions.boundedHeatmap.width)
    .attr("height", dimensions.boundedHeatmap.height)
    .attr("x", dimensions.boundedContext.width + dimensions.marginInner.right)
    .attr("fill", "#c71417")
    .attr("fill-opacity", 0.2)
    .attr("stroke", "#c71417")
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 1);
}

makePlot();

// resize the plot when the window is resized
window.addEventListener("resize", () => {
  d3.select("#chart").selectAll("svg").remove();
  makePlot();
});
