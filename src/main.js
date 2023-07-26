import "../style.css";
import { UI, Alerts } from "./ui.js";
import { validateSpecification } from "./utils.js";
import * as d3 from "d3";
import { Tool } from "./tool.js";
import exampleData from "../data/example.json";

// Initialize the UI
const alert = new Alerts();
// Initialize the tool and it's state
let State;
fetchData().then((data) => {
  // Add data to the tool
  State = new Tool(data, new UI());

  // Set up the event listeners
  setUpJsonFileUploadListeners();
  setUpChartOptionListeners();
  setUpProteinOptionListeners();
  setUpDownloadButtonListeners();
  setUpWindowResizeListener();
});

// Get data from remote URL or local JSON file
async function fetchData() {
  const urlParams = new URLSearchParams(window.location.search);
  const dataUrl = urlParams.get("data");

  if (dataUrl) {
    try {
      const response = await fetch(dataUrl);

      if (!response.ok) {
        alert.showAlert(`HTTP error! status: ${response.status}`);
        return exampleData; // return example data as fallback
      } else {
        const data = await response.json();
        // Validate the data
        try {
          validateSpecification(data);
        } catch (error) {
          alert.showAlert(error.message);
          return exampleData; // return example data as fallback
        }
        return data;
      }
    } catch (error) {
      alert.showAlert(`Fetch operation failed: ${error.message}`);
      return exampleData; // return example data as fallback
    }
  } else {
    return exampleData; // no dataUrl parameter, return example data
  }
}

// Set up the event listener for the JSON file upload
function setUpJsonFileUploadListeners() {
  d3.select("#local-json-file").on("change", function () {
    // Get the file input element
    const input = document.getElementById("local-json-file");

    // Check if a file was selected
    if (input.files.length === 0) {
      alert.showAlert("Please select a JSON file to upload.");
      return;
    }

    // Get the selected file
    const file = input.files[0];

    // Check if the selected file is a JSON file
    if (file.type !== "application/json") {
      alert.showAlert("Please select a valid JSON file.");
      return;
    }

    // Use the FileReader API to read the contents of the JSON file
    const reader = new FileReader();
    reader.onload = function () {
      // Parse the JSON file into an object and write it to data
      const data = JSON.parse(reader.result);
      // Validate the data
      try {
        validateSpecification(data);
      } catch (error) {
        alert.showAlert(error.message);
        return;
      }
      // Update the tool's state
      State.data = data;
      State.initTool();
    };
    reader.readAsText(file);

    // Get the URL parameters
    window.history.replaceState({}, "", `${location.pathname}`);

    // Clear the URL input element
    document.getElementById("url-json-file").value = "";

    // Trigger a resize event
    window.dispatchEvent(new Event("resize"));
  });

  d3.select("#url-json-file").on("keyup", async function (event) {
    // If the key pressed was not 'Enter', return
    if (event.key !== "Enter") {
      return;
    }

    // Check if a URL was provided
    if (!this.value) {
      alert.showAlert("Please enter a URL.");
      return;
    }

    // Check if the URL is valid
    try {
      new URL(this.value);
    } catch (_) {
      alert.showAlert("Please enter a valid URL.");
      return;
    }

    try {
      const response = await fetch(this.value);

      if (!response.ok) {
        alert.showAlert(
          `There was an error fetching data from the URL. HTTP Status: ${response.status}`
        );
        return;
      }

      // Parse the response into a JSON object
      const data = await response.json();
      // Validate the data
      try {
        validateSpecification(data);
      } catch (error) {
        alert.showAlert(error.message);
        return;
      }

      // Get the URL parameters
      const urlParams = new URLSearchParams();

      // Set the data parameter of the URL
      urlParams.set("data", this.value);
      window.history.replaceState({}, "", `${location.pathname}?${urlParams}`);

      // Update the tool's state
      State.data = data;
      State.initTool();

      // Trigger a resize event
      window.dispatchEvent(new Event("resize"));

      // Clear the local input element
      document.getElementById("local-json-file").value = "";
    } catch (error) {
      alert.showAlert(`Fetch operation failed: ${error.message}`);
    }
  });
}

// Set up the event listeners for the chart options
function setUpChartOptionListeners() {
  d3.select("#dataset").on("change", function () {
    State.updateSelectedDataset(this);
    // Reize the accordion menu if necessary (i.e. legend size changes)
    let btn = document.getElementById("chart-btn");
    if (btn.classList.contains("is-open")) {
      let content = btn.nextElementSibling;
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
  window.addEventListener("proteinConditionSelected", function (event) {
    State.updateProteinCondition(event.detail);
  });
  window.addEventListener("chartConditionsSelected", function (event) {
    State.updateChartConditions(event.detail);
  });
  d3.select("#summary").on("change", function () {
    State.updateChartOptions(this);
  });
  d3.select("#floor").on("change", function () {
    State.updateChartOptions(this);
  });
  d3.select("#mutations").on("change", function () {
    State.updateChartOptions(this);
  });
}

// Set up the event listeners for the protein options
function setUpProteinOptionListeners() {
  d3.select("#proteinRepresentation").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#selectionRepresentation").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#backgroundRepresentation").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#ligandRepresentation").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#proteinColor").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#backgroundColor").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#ligandColor").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#backgroundOpacity").on("input", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#proteinOpacity").on("input", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#selectionOpacity").on("input", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#showGlycans").on("change", function () {
    State.updateProteinOptions(this);
  });
}

// Set up the event listeners for the download buttons
function setUpDownloadButtonListeners() {
  // Set up the event listener for downloading the protein image
  d3.select("#downloadProtein").on("click", function () {
    State.protein.saveImage();
  });
  // Set up the event listener for downloading the plot image
  d3.select("#downloadPlot").on("click", function () {
    State.chart.saveImage();
  });
}

// Set up the event listener to respond to window resizing
function setUpWindowResizeListener() {
  // Set up the event listener to respond to window resizing
  window.addEventListener("resize", function () {
    const chartHeight = State.chart.resize();
    State.protein.resize(chartHeight);
  });
}
