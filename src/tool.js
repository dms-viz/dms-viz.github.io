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

    // Set up the initial chart
    tool.chart = new Chart(
      {
        parentElement: "#chart",
        experiment: tool.experiment,
        chartEpitopes: tool.chartEpitopes,
        summary: tool.summary,
        floor: tool.floor,
        metric: tool.data[tool.experiment].metric_col,
        tooltips: tool.data[tool.experiment].tooltip_cols,
        filters: tool.filters,
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
        pdbID: tool.data[tool.experiment].pdb,
        dispatch: tool.chart.dispatch,
        proteinRepresentation: tool.proteinRepresentation,
        selectionRepresentation: tool.selectionRepresentation,
        backgroundRepresentation: tool.backgroundRepresentation,
        ligandRepresentation: tool.ligandRepresentation,
        proteinColor: tool.proteinColor,
        backgroundColor: tool.backgroundColor,
        ligandColor: tool.ligandColor,
        backgroundOpacity: tool.backgroundOpacity,
        proteinOpacity: tool.proteinOpacity,
        selectionOpacity: tool.selectionOpacity,
        showGlycans: tool.showGlycans,
      },
      tool.data
    );

    // Populate Chart Options
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

    // Populate Protein Options
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
    tool.initSelect(
      d3.select("#ligandRepresentation"),
      ["spacefill", "ball+stick"],
      tool.ligandRepresentation
    );
    tool.initCheckbox(d3.select("#showGlycans"), tool.showGlycans);
    tool.initColorPicker(d3.select("#proteinColor"), tool.proteinColor);
    tool.initColorPicker(d3.select("#backgroundColor"), tool.backgroundColor);
    tool.initColorPicker(d3.select("#ligandColor"), tool.ligandColor);
    tool.initRange(d3.select("#proteinOpacity"), tool.proteinOpacity);
    tool.initRange(d3.select("#selectionOpacity"), tool.selectionOpacity);
    tool.initRange(d3.select("#backgroundOpacity"), tool.backgroundOpacity);

    // Populate Filter Sites
    d3.select("#filters").html("");
    if (tool.data[tool.experiment].filter_cols) {
      Object.keys(tool.data[tool.experiment].filter_cols).forEach((col) => {
        // Add the filter to the page
        tool.initFilter(
          col,
          tool.data[tool.experiment].filter_cols[col],
          d3.min(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          d3.max(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          tool.filters[col]
        );
      });
    }
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
   * Initialize and set up the checkboxes
   */
  initCheckbox(selection, checked = true) {
    selection.property("checked", checked);
  }
  /**
   * Initialize and set up the color pickers
   */
  initColorPicker(selection, color = "#D3D3D3") {
    selection.attr("type", "color").property("value", color);
  }
  /**
   * Initialize the default value for a range input
   */
  initRange(selection, value = 1) {
    selection
      .attr("type", "range")
      .attr("min", 0)
      .attr("max", 1)
      .attr("step", 0.01)
      .property("value", value);
  }
  /**
   * Initialize and set up a filter slider
   */
  initFilter(column, label, min, max, value) {
    let tool = this;

    // Container for the filters
    let filters = d3.select("#filters");
    // Add a label for the filter
    filters
      .append("label")
      .attr("for", column)
      .style("display", "block")
      .text(label);
    // Add the slider element
    filters
      .append("input")
      .attr("type", "range")
      .attr("id", column)
      .attr("min", min)
      .attr("max", max)
      .attr("value", value)
      .attr("step", (max - min) / 100)
      .on("input", function () {
        // Add an event listener to update the text when the slider is moved
        tool.updateFilter(this);
      });
    // Add the text element
    filters
      .append("span")
      .attr("class", "output")
      .attr("id", `${column}-output`)
      .text(d3.format(".2f")(value));
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
    // Update the filters
    tool.filters = {};
    if (tool.data[tool.experiment].filter_cols) {
      tool.filters = Object.keys(tool.data[tool.experiment].filter_cols).reduce(
        (acc, key) => ({
          ...acc,
          [key]: d3.min(
            tool.data[tool.experiment].mut_metric_df,
            (e) => e[key]
          ),
        }),
        {}
      );
    }
    d3.select("#filters").html("");
    if (tool.data[tool.experiment].filter_cols) {
      Object.keys(tool.data[tool.experiment].filter_cols).forEach((col) => {
        // Add the filter to the page
        tool.initFilter(
          col,
          tool.data[tool.experiment].filter_cols[col],
          d3.min(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          d3.max(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          tool.filters[col]
        );
      });
    }
    tool.chart.config.filters = tool.filters;

    // Update the chart and deselect all sites
    tool.chart.deselectSites();
    tool.chart.updateVis();
    tool.legend.updateVis();

    // Only update the protein if the structure has changed
    if (tool.data[tool.experiment].pdb !== tool.protein.config.pdbID) {
      tool.protein.config.pdbID = tool.data[tool.experiment].pdb;
      tool.protein.clear();
      tool.protein.load();
    }

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
    tool.protein.updateData();

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
    tool.protein.updateRepresentation();

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
    tool.protein.updateData();

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
  updateFilter(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const col = selection.attr("id");
    const value = parseFloat(selection.property("value"));

    // Update the label for the filter
    d3.select(`#${col}-output`).text(d3.format(".2f")(value));

    // Update the filter object
    tool.filters[col] = value;
    tool.chart.config.filters = tool.filters;

    // Update the visualization
    tool.chart.updateVis();
    tool.protein.updateData();
    tool.protein.selectSites(d3.selectAll(".selected").data());

    tool.updateURLParams();
  }
  /**
   * Get the state from the URL
   */
  setStateFromURL() {
    let tool = this;

    // Default parameter options
    const experiment = Object.keys(tool.data)[0];
    tool.urlParams = {
      experiment: { name: "e", default: experiment },
      proteinEpitope: {
        name: "pe",
        default: tool.data[experiment].epitopes[0],
      },
      chartEpitopes: {
        name: "ce",
        default: tool.data[experiment].epitopes,
      },
      summary: { summary: "s", default: "sum" },
      floor: { name: "f", default: true },
      proteinRepresentation: { name: "pr", default: "cartoon" },
      selectionRepresentation: { name: "sr", default: "spacefill" },
      backgroundRepresentation: { name: "br", default: "rope" },
      ligandRepresentation: { name: "lr", default: "spacefill" },
      proteinColor: { name: "pc", default: "#D3D3D3" },
      backgroundColor: { name: "bc", default: "#D3D3D3" },
      ligandColor: { name: "lc", default: "#D3D3D3" },
      proteinOpacity: { name: "po", default: 1 },
      selectionOpacity: { name: "so", default: 1 },
      backgroundOpacity: { name: "bo", default: 1 },
      showGlycans: { name: "g", default: false },
    };
    tool.urlParams.filters = { name: "fi", default: {} };
    if (tool.data[experiment].filter_cols) {
      tool.urlParams.filters.default = Object.keys(
        tool.data[experiment].filter_cols
      ).reduce(
        (acc, key) => ({
          ...acc,
          [key]: d3.min(tool.data[experiment].mut_metric_df, (e) => e[key]),
        }),
        {}
      );
    }

    // Get the current URL parameters object
    const currentURLParams = new URLSearchParams(window.location.search);

    // Set the state from the URL parameters or default values
    for (const key in tool.urlParams) {
      // Get the value from the URL parameters
      const value = currentURLParams.get(tool.urlParams[key].name);
      // If the value is not null, then set the state to the value
      if (value !== null) {
        tool[key] = JSON.parse(decodeURIComponent(value));
      } else {
        // Otherwise, set the state to a copy of the default value
        tool[key] = JSON.parse(JSON.stringify(tool.urlParams[key].default));
      }
    }
  }
  /**
   * Update the URL parameters when the state changes
   */
  updateURLParams() {
    let tool = this;

    // Get the current URL parameters object
    const currentURLParams = new URLSearchParams(window.location.search);

    // If the data parameter is not in the URL don't add any parameters
    if (!currentURLParams.has("data")) {
      return;
    }

    // Set the values of the URL parameters from the state
    for (const key in tool.urlParams) {
      // If the value is the default, then don't add it to the URL
      if (
        JSON.stringify(tool[key]) ===
        JSON.stringify(tool.urlParams[key].default)
      ) {
        continue;
      }
      currentURLParams.set(
        tool.urlParams[key].name,
        encodeURIComponent(JSON.stringify(tool[key]))
      );
    }

    // Update the URL
    window.history.replaceState(
      {},
      "",
      `${window.location.origin}${
        window.location.pathname
      }?${currentURLParams.toString()}`
    );
  }
}
