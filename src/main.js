import "../style.css";
import * as d3 from "d3";
import * as NGL from "ngl";
import { Chart } from "./chart.js";
import { Protein } from "./protein.js";
import exampleData from "../data/hiv.json";

// INITIALIZE THE EXAMPLE DATA //

// Call the example data polyclonal
let polyclonal = exampleData;

// Format the JSON for each antibody model
for (const selection in polyclonal) {
  // Get the map for reference sites to sequential sites
  const siteMap = polyclonal[selection].sitemap;
  polyclonal[selection].mut_escape_df = polyclonal[selection].mut_escape_df.map(
    (e) => {
      return {
        ...e,
        site: siteMap[e.site].sequential_site,
        site_reference: e.site,
        site_protein: siteMap[e.site].protein_site,
        site_chain: siteMap[e.site].chains,
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
let pdbID = polyclonal[model].pdb;

// UPDATE SELECT OPTIONS //

function updateSelection(selection, options) {
  selection
    .selectAll("option")
    .data(options)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);
}
// Set the chart config selection boxes
updateSelection(d3.select("#model"), models);
updateSelection(d3.select("#metric"), ["sum", "mean", "max", "min"]);
updateSelection(d3.select("#epitope"), polyclonal[model].epitopes);
// Set the protein config selection boxes
updateSelection(d3.select("#proteinRepr"), ["cartoon", "rope", "ball+stick"]);
updateSelection(d3.select("#selectionRepr"), ["spacefill", "surface"]);
updateSelection(d3.select("#backgroundRepr"), [
  "rope",
  "cartoon",
  "ball+stick",
]);

// INITIALIZE THE PLOT //

const chart = new Chart(
  {
    model: model,
    epitope: epitope,
    metric: metric,
    floor: floor,
    parentElement: "#chart",
  },
  polyclonal
);

// Load the protein structure from a URL
const protein = new Protein(polyclonal, {
  parentElement: "viewport",
  model: model,
  epitope: epitope,
  metric: metric,
  floor: floor,
  pdbID: pdbID,
  dispatch: chart.dispatch,
});

// DOM SELECTIONS AND MANIPULATIONS //

d3.select("#model").on("change", function () {
  chart.config.model = d3.select(this).property("value");
  console.log(polyclonal);
  chart.config.epitope = polyclonal[chart.config.model].epitopes[0];
  // Update the epitope selection
  updateSelection(
    d3.select("#epitope"),
    polyclonal[chart.config.model].epitopes
  );
  chart.updateVis();
  protein.config.model = chart.config.model;
  protein.config.epitope = polyclonal[chart.config.model].epitopes[0];
  // Clears the current structure and reloads it
  protein.config.pdbID = polyclonal[chart.config.model].pdb;
  protein.clear();
});

d3.select("#epitope").on("change", function () {
  chart.config.epitope = parseInt(d3.select(this).property("value"));
  chart.updateVis();
  protein.config.epitope = chart.config.epitope;
  protein.makeColorScheme();
});

d3.select("#metric").on("change", function () {
  chart.config.metric = d3.select(this).property("value");
  chart.updateVis();
  protein.config.metric = chart.config.metric;
  protein.makeColorScheme();
});

d3.select("#floor").on("change", function () {
  chart.config.floor = d3.select(this).property("checked");
  chart.updateVis();
  protein.config.floor = chart.config.floor;
  protein.makeColorScheme();
});

// Update the protein representation
d3.select("#proteinRepr").on("change", function () {
  protein.config.proteinRepresentation = d3.select(this).property("value");
  protein.clear();
});

d3.select("#selectionRepr").on("change", function () {
  protein.config.selectionRepresentation = d3.select(this).property("value");
  protein.clear();
});

d3.select("#backgroundRepr").on("change", function () {
  protein.config.backgroundRepresentation = d3.select(this).property("value");
  protein.clear();
});

d3.select("#proteinColor").on("change", function () {
  protein.config.proteinColor = d3.select(this).property("value");
  protein.clear();
});

d3.select("#backgroundColor").on("change", function () {
  protein.config.backgroundColor = d3.select(this).property("value");
  protein.clear();
});

d3.select("#downloadProtein").on("click", function () {
  protein.stage
    .makeImage({
      factor: 4,
      antialias: true,
      trim: false,
      transparent: false,
    })
    .then(function (blob) {
      NGL.download(blob, "protein_plot.png");
    });
});

d3.select("#json-file").on("change", function () {
  // Get the file input element
  const input = document.getElementById("json-file");

  // Check if a file was selected
  if (input.files.length === 0) {
    alert("Please select a JSON file to upload.");
    return;
  }
  // Get the selected file
  const file = input.files[0];

  // Check if the selected file is a JSON file
  if (file.type !== "application/json") {
    alert("Please select a valid JSON file.");
    return;
  }

  // Use the FileReader API to read the contents of the JSON file
  const reader = new FileReader();
  reader.onload = function () {
    // Parse the JSON file
    const json = JSON.parse(reader.result);

    // Do something with the JSON data (e.g. display it on the page)
    console.log(json);

    // UPDATE THE MODEL BASED ON NEW DATA //
    polyclonal = json;

    // Format the JSON for each antibody model
    for (const selection in polyclonal) {
      // Get the map for reference sites to sequential sites
      const siteMap = polyclonal[selection].sitemap;
      polyclonal[selection].mut_escape_df = polyclonal[
        selection
      ].mut_escape_df.map((e) => {
        return {
          ...e,
          site: siteMap[e.site].sequential_site,
          site_reference: e.site,
          site_protein: siteMap[e.site].protein_site,
          site_chain: siteMap[e.site].chains,
          escape: e.escape_mean,
        };
      });
    }

    const models = Object.keys(polyclonal);
    let model = models[0];
    let epitope = polyclonal[model].epitopes[0];
    let metric = "sum";
    let floor = true;
    let pdbID = polyclonal[model].pdb;

    // Set the chart config selection boxes
    updateSelection(d3.select("#model"), models);
    updateSelection(d3.select("#epitope"), polyclonal[model].epitopes);

    // Update the chart
    chart.config.model = model;
    chart.config.epitope = epitope;
    chart.config.metric = metric;
    chart.config.floor = floor;
    chart.data = polyclonal;
    chart.updateVis();

    // Update the protein
    protein.config.model = model;
    protein.config.epitope = epitope;
    protein.config.metric = metric;
    protein.config.floor = floor;
    protein.config.pdbID = pdbID;
    protein.data = polyclonal;
    protein.clear();
  };
  reader.readAsText(file);
});

// Add event listener to respond to window resizing
window.addEventListener("resize", function () {
  console.log("Calling resize");
  chart.resize();
  protein.stage.handleResize();
});

// Modal UI
const modal = document.querySelector(".modal");
const trigger = document.querySelector(".trigger");
const closeButton = document.querySelector(".close-button");

function toggleModal() {
  modal.classList.toggle("show-modal");
}

function windowOnClick(event) {
  if (event.target === modal) {
    toggleModal();
  }
}

trigger.addEventListener("click", toggleModal);
closeButton.addEventListener("click", toggleModal);
window.addEventListener("click", windowOnClick);
