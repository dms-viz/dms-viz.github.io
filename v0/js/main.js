import "../css/main.css";
import { UI, Alerts } from "./ui.js";
import { MarkdownRenderer, delay } from "./utils.js";
import { marked } from "marked";
import * as d3 from "d3";
import { Tool } from "./tool.js";
import exampleData from "../data/example.json";

// Initialize the state variable
let State;
// Initialize the UI
let sessionUI = new UI();
// Initialize the Alerts
const alert = new Alerts();
// Initialize a markdown renderer that supports KaTeX
const renderer = new MarkdownRenderer();

// Initialize the tool
Promise.all([
  initializeTool()
    .then((data) => {
      // Show a message that describes in the basic instructions
      alert.showAlert(
        `<details>
        <summary><strong>Click for instructions!</strong></summary>
        <p>
          Welcome to <strong><code>dms-viz</code></strong>! If you're new here, we suggest checking out
          the <a href='https://dms-viz.github.io/dms-viz-docs/' target='_blank'>documentation</a>. 
          <br/>
          <br/>
          To use the visualization, <em>zoom</em> into regions of the
          <strong>focus plot</strong> (the central summary plot) by 
          <em>brushing</em> (<em>click and drag</em>) over the <strong>context plot</strong> (the top area plot).
          <br/>
          <br/>
          Select sites by <em>clicking</em> on points in the <strong>focus plot</strong>.
          The mutations at these site will appear in a <strong>detail plot</strong> (the leftmost heatmap).
          These sites will also appear on the <strong>protein structure</strong>.
          <br/>
          <br/>
          To more efficiently select sites on the <strong>protein structure</strong>, 
          <em>brush</em> over points in the <strong>focus plot</strong>.
          To deselect sites, you can either <em>double-click</em> on the <strong>focus plot</strong>,
          or hold down the option key <kbd>⌥</kbd> while <em>brushing</em> over points to deselect.
          <br/>
          <br/>
          If there are multiple conditions in the data, an interactive <strong>legend</strong>
          will appear in the <em>Chart Options</em> in the sidebar. <em>Click</em> on
          the <strong>legend</strong> values to determine which condition will appear in the
          <strong>protein structure</strong>. To remove or add conditions to the
          <strong>focus plot</strong>, <em>click</em> while holding down the option key <kbd>⌥</kbd>.
          <br/>
          <br/>
          Interact with the <strong>protein structure</strong> by zooming using two
          fingers on your tackpad or mouse. Change the orientation by <em>clicking and dragging</em> 
          the structure. Reset the initial zoom and position by pressing the <kbd>r</kbd> key.
        </p>
        </details>`,
        "instruct"
      );
      // Add data to the tool
      State = new Tool(removeMarkdown(data), sessionUI);
      // Initialize the event listeners here
      setUpFileUploadListeners();
      setUpChartOptionListeners();
      setUpProteinOptionListeners();
      setUpDownloadButtonListeners();
      setUpWindowResizeListener();
    })
    .then(() => {
      // Trigger a resize event after everything is done
      window.dispatchEvent(new Event("resize"));
      // Make sure the chart submenu is open if the sidebar is open
      if (!sessionUI.sidebar.classList.contains("sidebar-collapsed")) {
        const chartBtn = document.getElementById("chart-btn");
        sessionUI.toggleAccordion(chartBtn);
      }
    }),
  delay(3000),
])
  .then(() => {
    // Hide the loading screen when everything is done
    document.getElementById("loadingScreen").style.display = "none";
  })
  .catch((error) => {
    // Hide the loading screen and show an error if the initialization fails
    document.getElementById("loadingScreen").style.display = "none";
    alert.showAlert(error.message);
  });

async function initializeTool() {
  const urlParams = new URLSearchParams(window.location.search);
  const dataUrl = urlParams.get("data");
  const markdownUrl = urlParams.get("markdown");

  let data = exampleData;

  // Initialize the tool using remote data if it is provided
  if (dataUrl) {
    // Fetch the data from the URL
    data = (await fetchFromURL(dataUrl)) || exampleData;

    // Update the UI to reflect that the data is remote
    document.getElementById("remote-file").click(function (event) {
      event.stopPropagation();
    });
    document.getElementById("url-json-file").value = dataUrl;
    document.getElementById("url-markdown-file").disabled = false;

    // If a markdown description is provided in the URL, render it
    if (markdownUrl) {
      const markdown = await fetchFromURL(markdownUrl, "markdown");
      renderMarkdown(markdown);
      document.getElementById("url-markdown-file").value = markdownUrl;
      // If there is also a description in the file, warn the user that it's being overwritten by the remote
      if (data.markdown_description) {
        alert.showAlert(
          "The remote markdown description is being used instead of the one in the JSON file.",
          "warning"
        );
      }
    } else if (data.markdown_description) {
      renderMarkdown(data.markdown_description);
    } else {
      hideMarkdown();
    }
  } else {
    // Render the markdown in the example data
    renderMarkdown(data.markdown_description);
  }
  return data;
}

/**
 * Fetch data from a URL and parse based on the specified format.
 *
 * @param {string} URL - The URL to fetch data from.
 * @param {'json'|'markdown'} format - The desired data format. Accepts 'json' or 'markdown'.
 * @returns {Object|string|null} - Returns parsed data or null in case of an error.
 */
async function fetchFromURL(URL, format = "json") {
  let data = null;
  try {
    const response = await fetch(URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    switch (format) {
      case "json":
        data = await response.json();
        break;
      case "markdown":
        data = await response.text();
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    alert.showAlert(`Fetch operation failed: ${error.message}`);
    console.error(`Fetch operation failed: ${error.message}`);
  }
  return data;
}

// Function to render markdown
function renderMarkdown(markdown) {
  try {
    document.getElementById("markdown").style.display = "block";
    document.getElementById("markdown-container").innerHTML = marked.parse(
      markdown,
      { renderer: renderer }
    );
  } catch (error) {
    alert.showAlert(
      "Markdown rendering failed. Please check that the markdown is properly formatted."
    );
  }
}

// Function to hide the markdown
function hideMarkdown() {
  document.getElementById("markdown").style.display = "none";
  document.getElementById("markdown-container").innerHTML = "";
}

// Function to return a copy of the data object without the markdown description
function removeMarkdown(data) {
  const dataCopy = JSON.parse(JSON.stringify(data));
  delete dataCopy.markdown_description;
  return dataCopy;
}

// Set up the event listeners for the file upload buttons
function setUpFileUploadListeners() {
  // Load in the JSON from a local file
  d3.select("#local-json-file").on("change", function () {
    const input = document.getElementById("local-json-file");

    if (input.files.length === 0) {
      alert.showAlert("Please select a JSON file to upload.");
      return;
    }

    const file = input.files[0];

    if (file.type !== "application/json") {
      alert.showAlert("Please select a valid JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      try {
        // Parse the JSON file into an object
        const data = JSON.parse(reader.result);

        // Update the tool's state
        State.data = removeMarkdown(data);
        State.initTool();

        // Clear the URL parameters and remote UI input elements
        window.history.replaceState({}, "", `${location.pathname}`);
        document.getElementById("url-json-file").value = "";
        document.getElementById("url-markdown-file").value = "";
        document.getElementById("url-markdown-file").disabled = true;

        // Check if there is a markdown description in the data
        if (data.markdown_description) {
          renderMarkdown(data.markdown_description);
        } else {
          hideMarkdown();
        }

        // Make sure any open accordions are resized
        var submenus = document.querySelectorAll(".submenu");
        submenus.forEach(function (submenu) {
          // Find the accordion button within the submenu
          var accordionButton = submenu.querySelector(".accordion");
          // Find the accordion content within the submenu
          var accordionContent = submenu.querySelector(".accordion-content");
          if (accordionButton && accordionContent) {
            // Check if the accordion is open
            if (accordionButton.classList.contains("is-open")) {
              // Set the max-height to the scrollHeight of the content
              accordionContent.style.maxHeight =
                accordionContent.scrollHeight + "px";
            }
          }
        });

        // Trigger a resize event
        window.dispatchEvent(new Event("resize"));
      } catch (error) {
        alert.showAlert(error.message);
      }
    };

    reader.readAsText(file);
  });

  // Load in the JSON from a remote URL
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

    // Fetch a response from the URL
    const data = await fetchFromURL(this.value);

    // Enable the user to add markdown
    document.getElementById("url-markdown-file").disabled = false;

    // Get the URL parameters
    const urlParams = new URLSearchParams();

    // Set the data parameter of the URL
    urlParams.set("data", this.value);
    window.history.replaceState({}, "", `${location.pathname}?${urlParams}`);

    // Update the tool's state
    State.data = removeMarkdown(data);
    State.initTool();

    // Check if there is a markdown description in the data
    if (data.markdown_description) {
      renderMarkdown(data.markdown_description);
    } else {
      hideMarkdown();
    }

    // Make sure any open accordions are resized
    var submenus = document.querySelectorAll(".submenu");
    submenus.forEach(function (submenu) {
      // Find the accordion button within the submenu
      var accordionButton = submenu.querySelector(".accordion");
      // Find the accordion content within the submenu
      var accordionContent = submenu.querySelector(".accordion-content");
      if (accordionButton && accordionContent) {
        // Check if the accordion is open
        if (accordionButton.classList.contains("is-open")) {
          // Set the max-height to the scrollHeight of the content
          accordionContent.style.maxHeight =
            accordionContent.scrollHeight + "px";
        }
      }
    });

    // Trigger a resize event
    window.dispatchEvent(new Event("resize"));

    // Clear the local input element
    document.getElementById("local-json-file").value = "";
  });

  // Load in the markdown from a remote URL
  d3.select("#url-markdown-file").on("keyup", async function (event) {
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

    // Parse the response
    const markdown = await fetchFromURL(this.value, "markdown");

    // Render the markdown description
    renderMarkdown(markdown);

    // Get the URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Set the markdown parameter of the URL
    urlParams.set("markdown", this.value);
    window.history.replaceState({}, "", `${location.pathname}?${urlParams}`);
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
  d3.select("#selectAll").on("click", function () {
    State.selectAllSites();
  });
  document.addEventListener("sitesDeselected", () => {
    console.log("sitesDeselected");
    State.selectAll = false;
    State.updateURLParams();
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
  d3.select("#screenColor").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#ligandElement").on("change", function () {
    this.value = this.checked ? "true" : "false";
    State.updateProteinOptions(this);
  });
  d3.select("#proteinElement").on("change", function () {
    this.value = this.checked ? "true" : "false";
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
    this.value = this.checked ? "true" : "false";
    State.updateProteinOptions(this);
  });
  d3.select("#showNucleotides").on("change", function () {
    this.value = this.checked ? "true" : "false";
    State.updateProteinOptions(this);
  });
  d3.select("#showNonCarbonHydrogens").on("change", function () {
    this.value = this.checked ? "true" : "false";
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
