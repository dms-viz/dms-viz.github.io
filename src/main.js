import "../style.css";
import * as d3 from "d3";
import polyclonal from "../data/polyclonal.json";
import { Chart } from "./chart.js";

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
let selectedSites = [];

// DEFINE FUNCTIONS //

// Function to update html selection with options
function updateSelection(selection, options) {
  selection.innerHTML = options
    .map((option) => `<option value="${option}">${option}</option>`)
    .join("");
}

// DOM SELECTIONS AND MANIPULATIONS //

// For each selection element, update with options
const modelSelection = document.getElementById("model");
updateSelection(modelSelection, models);
const epitopeSelection = document.getElementById("epitope");
updateSelection(epitopeSelection, polyclonal[models[0]].epitopes);
const metricSelection = document.getElementById("metric");
updateSelection(metricSelection, ["sum", "mean", "min", "max"]);

// // Add event listener to update model
// modelSelection.addEventListener("change", (event) => {
//   model = event.target.value;
//   const epitopes = polyclonal[model].epitopes;
//   updateSelection(epitopeSelection, epitopes);
//   epitopeSelection.dispatchEvent(new Event("change"));
//   // updatePlot();
// });

// // Add event listener to update epitope
// epitopeSelection.addEventListener("change", (event) => {
//   epitope = event.target.value;
//   // updatePlot();
// });

// // Add event listener to update summary metric
// metricSelection.addEventListener("change", (event) => {
//   metric = event.target.value;
//   // updatePlot();
// });

// // Add event listener to update floor
// document.getElementById("floor").addEventListener("change", (event) => {
//   floor = event.target.checked;
//   // updatePlot();
// });

// INITIALIZE THE PLOT //
let chart = new Chart(
  {
    model: model,
    epitope: epitope,
    metric: metric,
    floor: floor,
    parentElement: "#chart",
  },
  polyclonal
);

d3.select("#metric").on("change", function () {
  chart.config.metric = d3.select(this).property("value");
  chart.updateVis();
});

d3.select("#model").on("change", function () {
  chart.config.model = d3.select(this).property("value");
  chart.updateVis();
});

d3.select("#floor").on("change", function () {
  chart.config.floor = d3.select(this).property("checked");
  chart.updateVis();
});
