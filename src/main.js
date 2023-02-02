import "../style.css";
import "./ui.js";
import * as d3 from "d3";
import * as NGL from "ngl";
import { Tool } from "./tool.js";
import exampleData from "../data/hiv.json";

// Initialize the tool and it's state
const State = new Tool(exampleData);

// Set up the event listener for the JSON file upload
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
    // Parse the JSON file into an object and write it to data
    const data = JSON.parse(reader.result);
    // Update the tool's state
    State.data = data;
    State.initTool();
  };
  reader.readAsText(file);
});

// Set up the event listeners for the chart options
d3.select("#model").on("change", function () {
  State.updateModel(this);
});
d3.select("#epitope").on("change", function () {
  State.updateData(this);
});
d3.select("#metric").on("change", function () {
  State.updateData(this);
});
d3.select("#floor").on("change", function () {
  State.updateData(this);
});

// Set up the event listeners for the protein options
d3.select("#proteinRepresentation").on("change", function () {
  State.updateProtein(this);
});
d3.select("#selectionRepresentation").on("change", function () {
  State.updateProtein(this);
});
d3.select("#backgroundRepresentation").on("change", function () {
  State.updateProtein(this);
});
d3.select("#proteinColor").on("change", function () {
  State.updateProtein(this);
});
d3.select("#backgroundColor").on("change", function () {
  State.updateProtein(this);
});

// TESTING event listeners for the range filters
const rangeInput = document.getElementById("times_seen");
const rangeOutput = document.getElementById("times_seen-output");
rangeInput.addEventListener("input", function () {
  rangeOutput.textContent = this.value;
  // Filter the chart data based on the range input
  State.filterData(this);
});

// Set up the event listeners for the download buttons
d3.select("#downloadProtein").on("click", function () {
  State.protein.stage
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

// Set up the event listener to respond to window resizing
window.addEventListener("resize", function () {
  State.chart.resize();
  State.protein.stage.handleResize();
});
