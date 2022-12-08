import "../style.css";
import * as d3 from "d3";
import polyclonal from "../data/polyclonal.json";
import { Chart } from "./chart.js";
import { Protein } from "./protein.js";

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

// UPDATE SELECT OPTIONS //

function updateSelection(selection, options) {
  selection
    .selectAll("option")
    .data(options)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);
}
updateSelection(d3.select("#model"), models);
updateSelection(d3.select("#metric"), ["sum", "mean", "max", "min"]);
updateSelection(d3.select("#epitope"), polyclonal[model].epitopes);

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

// DOM SELECTIONS AND MANIPULATIONS //

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

// Load the protein structure from a URL
let protein = new Protein(polyclonal, {
  parentElement: "viewport",
  model: model,
  epitope: epitope,
  metric: metric,
  floor: floor,
  pdbID: "7QO7",
});

// Set a timeout of 5 seconds to load the protein
setTimeout(() => {
  protein.selectSites([
    165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179,
  ]);
}, 5000);
