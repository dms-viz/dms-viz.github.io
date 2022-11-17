import "./style.css";
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
