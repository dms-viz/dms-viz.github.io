import "../style.css";
import "./ui.js";
import * as d3 from "d3";
import * as NGL from "ngl";
import { Tool } from "./tool.js";
import exampleData from "../data/example.json";

// Fetch the data from the URL if available, or use the default data
async function fetchData() {
  const urlParams = new URLSearchParams(window.location.search);
  const dataUrl = urlParams.get("data");
  if (dataUrl) {
    const response = await fetch(dataUrl);
    const data = await response.json();
    return data;
  }
  return exampleData;
}

// Initialize the tool and it's state
let State;
fetchData().then((data) => {
  // Add data to the tool
  State = new Tool(data);

  // Set up the event listeners
  setUpJsonFileUploadListener();
  setUpChartOptionListeners();
  setUpProteinOptionListeners();
  setUpDownloadButtonListeners();
  setUpWindowResizeListener();
});

// Set up the event listener for the JSON file upload
function setUpJsonFileUploadListener() {
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
}

// Set up the event listeners for the chart options
function setUpChartOptionListeners() {
  d3.select("#experiment").on("change", function () {
    State.updateExperiment(this);
    // Reize the accordion menu if necessary (i.e. legend size changes)
    let btn = document.getElementById("chart-btn");
    if (btn.classList.contains("is-open")) {
      let content = btn.nextElementSibling;
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
  // TODO: Improve the organization of these two event listeners
  window.addEventListener("proteinEpitopeSelected", function (event) {
    State.updateEpitope(event.detail);
  });
  window.addEventListener("chartEpitopesSelected", function (event) {
    State.updateEpitopes(event.detail);
  });
  //
  d3.select("#summary").on("change", function () {
    State.updateData(this);
  });
  d3.select("#floor").on("change", function () {
    State.updateData(this);
  });
}

// Set up the event listeners for the protein options
function setUpProteinOptionListeners() {
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
  d3.select("#showGlycans").on("change", function () {
    State.updateProtein(this);
  });
}

// Set up the event listeners for the download buttons
function setUpDownloadButtonListeners() {
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
}

// Set up the event listener to respond to window resizing
function setUpWindowResizeListener() {
  // Set up the event listener to respond to window resizing
  window.addEventListener("resize", function () {
    State.chart.resize();
    State.protein.resize();
  });
}
