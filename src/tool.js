import * as d3 from "d3";
import { Chart } from "./chart.js";
import { Protein } from "./protein.js";
import { Legend } from "./legend.js";

// Write a class to handle the state of the tool
export class Tool {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   */
  constructor(_data) {
    this.data = _data;
    this.initTool();
  }
  /**
   * Initialize the visualization
   */
  initTool() {
    let tool = this;

    // Format the data for each experiment
    for (const experiment in tool.data) {
      // Get the epitopes for the experiment and convert to strings
      tool.data[experiment].epitopes = tool.data[experiment].epitopes.map((e) =>
        e.toString()
      );
      // Get the map for reference sites to sequential sites
      const siteMap = tool.data[experiment].sitemap;
      // Get the column name of the mutation-level metric
      const metric = tool.data[experiment].metric_col;
      // Map the reference sites to sequential and protein sites
      tool.data[experiment].mut_metric_df = tool.data[
        experiment
      ].mut_metric_df.map((e) => {
        return {
          ...e,
          site: siteMap[e.reference_site].sequential_site,
          site_reference: e.reference_site,
          site_protein: siteMap[e.reference_site].protein_site,
          site_chain: siteMap[e.reference_site].chains,
          metric: e[metric],
          epitope: e.epitope.toString(),
        };
      });
    }

    // Get the detils from the data
    tool.setStateFromURL();

    // Update the URL parameters
    tool.updateURLParams();

    // TODO: Refactor these into the state or remove
    tool.pdb = tool.data[tool.experiment].pdb;
    tool.filterCols = tool.data[tool.experiment].filter_cols;
    tool.tooltipCols = tool.data[tool.experiment].tooltip_cols;

    // Set up the initial chart
    tool.chart = new Chart(
      {
        parentElement: "#chart",
        experiment: tool.experiment,
        chartEpitopes: tool.chartEpitopes,
        summary: tool.summary,
        floor: tool.floor,
        metric: tool.data[tool.experiment].metric_col,
        tooltips: tool.tooltipCols,
      },
      tool.data
    );

    // Set up the inital chart legend
    tool.legend = new Legend(
      {
        parentElement: "#legend",
        experiment: tool.experiment,
        proteinEpitope: tool.proteinEpitope,
        chartEpitopes: tool.chartEpitopes,
      },
      tool.data
    );

    // Set up the initial protein viewport
    tool.protein = new Protein(
      {
        parentElement: "viewport",
        experiment: tool.experiment,
        proteinEpitope: tool.proteinEpitope,
        summary: tool.summary,
        floor: tool.floor,
        pdbID: tool.pdb,
        dispatch: tool.chart.dispatch,
        proteinRepresentation: tool.proteinRepresentation,
        selectionRepresentation: tool.selectionRepresentation,
        backgroundRepresentation: tool.backgroundRepresentation,
        proteinColor: tool.proteinColor,
        backgroundColor: tool.backgroundColor,
        showGlycans: tool.showGlycans,
      },
      tool.data
    );

    // Populate the Chart Options
    tool.initSelect(
      d3.select("#experiment"),
      Object.keys(tool.data),
      tool.experiment
    );
    tool.initSelect(
      d3.select("#summary"),
      ["sum", "mean", "max", "min"],
      tool.summary
    );
    tool.initCheckbox(d3.select("#floor"), tool.floor);

    // Populate the Protein Options
    tool.initSelect(
      d3.select("#proteinRepresentation"),
      ["cartoon", "rope", "ball+stick"],
      tool.proteinRepresentation
    );
    tool.initSelect(
      d3.select("#selectionRepresentation"),
      ["spacefill", "surface"],
      tool.selectionRepresentation
    );
    tool.initSelect(
      d3.select("#backgroundRepresentation"),
      ["rope", "cartoon", "ball+stick"],
      tool.backgroundRepresentation
    );
    tool.initCheckbox(d3.select("#showGlycans"), tool.showGlycans);
    tool.initColorPicker(d3.select("#proteinColor"), tool.proteinColor);
    tool.initColorPicker(d3.select("#backgroundColor"), tool.backgroundColor);

    // Populate the Filter Sites
    tool.initFilters();
  }
  /**
   * Initialize and populate a select element
   */
  initSelect(selection, options, selected = options[0]) {
    selection
      .selectAll("option")
      .data(options)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d)
      .property("selected", (d) => d === selected);
  }
  /**
   * Initialize and populate a slider object
   */
  initSlider(selection, min, max, start, step) {
    selection
      .attr("min", min)
      .attr("max", max)
      .attr("value", start)
      .attr("step", step);
  }
  /**
   * Initialize and set up the checkboxes
   */
  initCheckbox(selection, checked = true) {
    selection.property("checked", checked);
  }
  /**
   * Initialize and set up the color pickers
   */
  initColorPicker(selection, color = "#D3D3D3") {
    selection.attr("type", "color").attr("value", color);
  }
  /**
   * Initialize and set up the filters
   */
  initFilters() {
    let tool = this;

    // Remove the old filters
    d3.select("#filters").html("");

    // If there are filters, add them to the tool
    if (tool.filterCols) {
      Object.keys(tool.filterCols).forEach((col) => {
        // Add the html for each slider
        document.getElementById("filters").innerHTML += `
              <label for="${col}" style="display: block">${tool.filterCols[col]}</label>
              <input id="${col}" type="range" />
              <span id="${col}-output" class="output"></span>
            `;

        // Get the min and max values for the column
        const colRange = d3.extent(
          tool.data[tool.experiment].mut_metric_df,
          (d) => d[col]
        );

        // Make an object that holds the filters and a corresponding mask of indices
        tool.filters = {
          [col]: [],
        };
        // Update the slider and set the text below the sliders
        tool.initSlider(
          d3.select(`#${col}`),
          ...colRange,
          colRange[0],
          (colRange[1] - colRange[0]) / 100
        );
        document.getElementById(`${col}-output`).textContent = d3.format(".2f")(
          colRange[0]
        );
      });

      // Add an event listener to the sliders
      Object.keys(tool.filterCols).forEach((col) => {
        document.getElementById(col).addEventListener("input", function () {
          // Filter the chart data based on the range input
          tool.updateFilteredSites(this);
        });
      });
    }
  }
  /**
   * Handle updates to the selected experiment
   */
  updateSelectedExperiment(node) {
    let tool = this;
    // Update the experiment selection in the chart, protein, and legend
    tool.experiment = d3.select(node).property("value");
    tool.chart.config.experiment = tool.experiment;
    tool.protein.config.experiment = tool.experiment;
    tool.legend.config.experiment = tool.experiment;
    // Update the epitope selection because experiments have different epitopes
    tool.chartEpitopes = tool.data[tool.experiment].epitopes;
    tool.proteinEpitope = tool.chartEpitopes[0];
    tool.chart.config.chartEpitopes = tool.chartEpitopes;
    tool.legend.config.chartEpitopes = tool.chartEpitopes;
    tool.protein.config.proteinEpitope = tool.proteinEpitope;
    tool.legend.config.proteinEpitope = tool.proteinEpitope;
    // Update the pdb structure since this is also experiment specific
    tool.pdb = tool.data[tool.experiment].pdb;
    tool.protein.config.pdbID = tool.pdb;
    // Update the chart and deselect all sites
    tool.chart.deselectSites();
    tool.chart.updateVis();
    tool.legend.updateVis();

    // Set a timeout to make sure the chart has been updated
    // This prevents the odd loading issue with the protein on Chrome
    setTimeout(() => {
      tool.protein.clear();
    }, 100);

    tool.updateURLParams();
  }
  /**
   * Handle updates within a single experiment
   */
  updateChartOptions(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const id = selection.attr("id");
    const value = selection.property(id == "floor" ? "checked" : "value");

    // Update the config
    tool[id] = value;
    tool.chart.config[id] = value;
    tool.protein.config[id] = value;

    // Update the chart and protein
    tool.chart.updateVis();
    tool.protein.makeColorScheme();

    tool.updateURLParams();
  }
  /**
   * Handle updates to the protein representation
   */
  updateProteinOptions(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const id = selection.attr("id");
    const value = selection.property(id == "showGlycans" ? "checked" : "value");

    // Update the config
    tool[id] = value;
    tool.protein.config[id] = value;

    // Update the chart and protein
    tool.protein.clear();

    tool.updateURLParams();
  }
  /**
   * Handle updates to which eptiope is shown on the protein
   */
  updateProteinEpitope(epitope) {
    let tool = this;

    // Update the config
    tool.proteinEpitope = epitope;
    tool.protein.config.proteinEpitope = epitope;

    // Update the chart and protein
    tool.protein.makeColorScheme();

    tool.updateURLParams();
  }
  /**
   * Handle updates to which eptiopes are displayed on the chart
   */
  updateChartEpitopes(epitopes) {
    let tool = this;

    // Update the config
    tool.chartEpitopes = epitopes;
    tool.chart.config.chartEpitopes = epitopes;

    // Update the chart and protein
    tool.chart.updateVis();

    tool.updateURLParams();
  }
  /**
   * Update sites in the chart based on filters
   */
  updateFilteredSites(node) {
    let tool = this;

    // Get the value of the slider
    const value = parseFloat(d3.select(node).property("value"));
    // Get the name of the element
    const id = d3.select(node).attr("id");

    // Set the text below the slider
    const rangeOutput = document.getElementById(`${id}-output`);
    rangeOutput.textContent = d3.format(".2f")(value);

    // Get the index of the regions to filter
    const indices = tool.data[tool.experiment].mut_metric_df
      .filter((d) => d[id] < value)
      .map((d) => tool.data[tool.experiment].mut_metric_df.indexOf(d));

    // Update the filter object
    tool.filters[id] = indices;

    // Collate all of the masks into a single array
    const mask = Array.from(
      new Set([].concat(...Object.values(tool.filters)))
    ).sort((a, b) => a - b);

    // if the length of the mask is equal to the length of the data, then don't update the chart
    if (mask.length == tool.data[tool.experiment].mut_metric_df.length) {
      return;
    }

    // Add the mask to the chart
    tool.chart["maskedIndicies"] = mask;

    // // Update the chart
    tool.chart.updateVis();
    tool.protein.makeColorScheme();
  }
  /**
   * Get the state from the URL
   */
  setStateFromURL() {
    let tool = this;

    // Get the URL parameters object
    const urlParams = new URLSearchParams(window.location.search);

    // Default chart option values for URL parameters
    const experiment = Object.keys(tool.data)[0];
    const proteinEpitope = tool.data[experiment].epitopes[0];
    const chartEpitopes = tool.data[experiment].epitopes;
    const summary = "sum";
    const floor = true;
    // Default protein option values for URL parameters
    const proteinRepresentation = "cartoon";
    const selectionRepresentation = "spacefill";
    const backgroundRepresentation = "rope";
    const proteinColor = "#D3D3D3";
    const backgroundColor = "#D3D3D3";
    const showGlycans = false;

    // Set the default chart option values or get the values from the URL
    tool.experiment = urlParams.get("experiment") || experiment;
    tool.proteinEpitope = urlParams.get("proteinEpitope") || proteinEpitope;
    tool.chartEpitopes =
      JSON.parse(decodeURIComponent(urlParams.get("chartEpitopes"))) ||
      chartEpitopes;
    tool.summary = urlParams.get("summary") || summary;
    tool.floor = urlParams.get("floor") || floor;
    if (typeof tool.floor == "string") {
      tool.floor = tool.floor == "true";
    }
    // Set the defult protein option values or get the values from the URL
    tool.proteinRepresentation =
      urlParams.get("proteinRepresentation") || proteinRepresentation;
    tool.selectionRepresentation =
      urlParams.get("selectionRepresentation") || selectionRepresentation;
    tool.backgroundRepresentation =
      urlParams.get("backgroundRepresentation") || backgroundRepresentation;
    tool.proteinColor = urlParams.get("proteinColor") || proteinColor;
    tool.backgroundColor = urlParams.get("backgroundColor") || backgroundColor;
    tool.showGlycans = urlParams.get("showGlycans") || showGlycans;
    if (typeof tool.showGlycans == "string") {
      tool.showGlycans = tool.showGlycans == "true";
    }
  }
  /**
   * Update the URL parameters when the state changes
   */
  updateURLParams() {
    let tool = this;

    // Get the URL parameters object
    const urlParams = new URLSearchParams(window.location.search);

    // If the data parameter is not in the URL, then return
    if (!urlParams.has("data")) {
      return;
    }

    // Set the URL parameters for the chart options
    urlParams.set("experiment", tool.experiment);
    urlParams.set("summary", tool.summary);
    urlParams.set("floor", tool.floor);
    urlParams.set("proteinEpitope", tool.proteinEpitope);
    urlParams.set("chartEpitopes", JSON.stringify(tool.chartEpitopes));
    // Set the URL parameters for the protein options
    urlParams.set("proteinRepresentation", tool.proteinRepresentation);
    urlParams.set("selectionRepresentation", tool.selectionRepresentation);
    urlParams.set("backgroundRepresentation", tool.backgroundRepresentation);
    urlParams.set("proteinColor", tool.proteinColor);
    urlParams.set("backgroundColor", tool.backgroundColor);
    urlParams.set("showGlycans", tool.showGlycans);

    // Update the URL
    window.history.replaceState(
      {},
      "",
      `${window.location.origin}${
        window.location.pathname
      }?${urlParams.toString()}`
    );
  }
}
