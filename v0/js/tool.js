import * as d3 from "d3";
import { isEqual, cloneDeep } from "lodash";
import { Chart } from "./chart.js";
import { Protein } from "./protein.js";
import { Legend } from "./legend.js";
import { Alerts } from "./ui.js";

// Write a class to handle the state of the tool
export class Tool {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   */
  constructor(_data, ui) {
    this.data = _data;
    this.uiInstance = ui;
    this.initTool();
  }
  /**
   * Initialize the visualization
   */
  initTool() {
    let tool = this;

    // Format the data for each dataset in the JSON file
    for (const dataset in tool.data) {
      // Check if conditions_col is null
      if (tool.data[dataset].condition_col === null) {
        tool.data[dataset].conditions = ["default"];
        // Set the legend to false because there is only one condition
        tool.data[dataset].legend = false;
      } else {
        // Get the conditions for the dataset and convert to strings
        tool.data[dataset].conditions = tool.data[dataset].conditions.map((e) =>
          e.toString()
        );
        tool.data[dataset].legend = true;
      }
      // Get the map for reference sites to sequential sites
      const siteMap = tool.data[dataset].sitemap;
      // Get the column name of the mutation-level metric
      const metric_col = tool.data[dataset].metric_col;
      // Get the name of the condition column
      const condition_col = tool.data[dataset].condition_col;
      // Map the reference sites to sequential and protein sites
      tool.data[dataset].mut_metric_df = tool.data[dataset].mut_metric_df.map(
        (e) => {
          const condition =
            condition_col !== null ? e[condition_col].toString() : "default";
          return {
            ...e,
            site: siteMap[e.reference_site].sequential_site,
            site_reference: e.reference_site,
            site_protein: siteMap[e.reference_site].protein_site,
            site_chain: siteMap[e.reference_site].chains,
            metric: e[metric_col],
            condition: condition,
          };
        }
      );
    }

    // Set the default dataset
    tool.dataset = Object.keys(tool.data)[0];

    // Update the description in the UI based on the dataset
    tool.datasetDescription =
      tool.data[tool.dataset].description ||
      "A description wasn't provided for this dataset.";
    tool.uiInstance.datasetDescription = tool.datasetDescription;

    // Get the detils from the data
    tool.setState();

    // Update the URL parameters
    tool.updateURLParams();

    // Set up the initial chart
    tool.chart = new Chart(
      {
        parentElement: "#chart",
        dataset: tool.dataset,
        chartConditions: tool.chartConditions,
        summary: tool.summary,
        floor: tool.floor,
        mutations: tool.mutations,
        metric: tool.data[tool.dataset].metric_col,
        tooltips: tool.data[tool.dataset].tooltip_cols,
        filters: tool.filters,
      },
      tool.data
    );

    // Set up the inital chart legend
    tool.legend = new Legend(
      {
        parentElement: "#legend",
        dataset: tool.dataset,
        proteinCondition: tool.proteinCondition,
        chartConditions: tool.chartConditions,
        label: tool.data[tool.dataset].condition_col,
      },
      tool.data
    );

    // Set up the initial protein viewport
    tool.protein = new Protein(
      {
        parentElement: "viewport",
        dataset: tool.dataset,
        proteinCondition: tool.proteinCondition,
        summary: tool.summary,
        floor: tool.floor,
        pdbID: tool.data[tool.dataset].pdb,
        dispatch: tool.chart.dispatch,
        proteinRepresentation: tool.proteinRepresentation,
        selectionRepresentation: tool.selectionRepresentation,
        backgroundRepresentation: tool.backgroundRepresentation,
        ligandRepresentation: tool.ligandRepresentation,
        proteinColor: tool.proteinColor,
        backgroundColor: tool.backgroundColor,
        ligandColor: tool.ligandColor,
        ligandElement: tool.ligandElement,
        proteinElement: tool.proteinElement,
        backgroundOpacity: tool.backgroundOpacity,
        proteinOpacity: tool.proteinOpacity,
        selectionOpacity: tool.selectionOpacity,
        showGlycans: tool.showGlycans,
        showNucleotides: tool.showNucleotides,
        showNonCarbonHydrogens: tool.showNonCarbonHydrogens,
      },
      tool.data
    );

    // Populate Chart Options
    tool.initSelect(
      d3.select("#dataset"),
      Object.keys(tool.data),
      tool.dataset
    );
    tool.initSelect(
      d3.select("#summary"),
      ["sum", "mean", "max", "min"],
      tool.summary
    );
    tool.initCheckbox(d3.select("#floor"), tool.floor);
    tool.initCheckbox(d3.select("#mutations"), tool.mutations);

    // Populate Protein Options
    tool.initSelect(
      d3.select("#proteinRepresentation"),
      ["spacefill", "surface", "cartoon", "rope", "ball+stick"],
      tool.proteinRepresentation
    );
    tool.initSelect(
      d3.select("#selectionRepresentation"),
      ["spacefill", "surface", "cartoon", "rope", "ball+stick"],
      tool.selectionRepresentation
    );
    tool.initSelect(
      d3.select("#backgroundRepresentation"),
      ["spacefill", "surface", "cartoon", "rope", "ball+stick"],
      tool.backgroundRepresentation
    );
    tool.initSelect(
      d3.select("#ligandRepresentation"),
      ["spacefill", "ball+stick"],
      tool.ligandRepresentation
    );
    tool.initCheckbox(d3.select("#showGlycans"), tool.showGlycans);
    tool.initCheckbox(d3.select("#showNucleotides"), tool.showNucleotides);
    tool.initCheckbox(
      d3.select("#showNonCarbonHydrogens"),
      tool.showNonCarbonHydrogens
    );
    tool.initColorPicker(d3.select("#proteinColor"), tool.proteinColor);
    tool.initColorPicker(d3.select("#backgroundColor"), tool.backgroundColor);
    tool.initColorPicker(d3.select("#ligandColor"), tool.ligandColor);
    tool.initCheckbox(d3.select("#ligandElement"), tool.ligandElement);
    tool.initCheckbox(d3.select("#proteinElement"), tool.proteinElement);
    tool.initRange(d3.select("#proteinOpacity"), tool.proteinOpacity);
    tool.initRange(d3.select("#selectionOpacity"), tool.selectionOpacity);
    tool.initRange(d3.select("#backgroundOpacity"), tool.backgroundOpacity);

    // Populate Filter Sites
    d3.select("#filters").html("");
    if (tool.data[tool.dataset].filter_cols) {
      Object.keys(tool.data[tool.dataset].filter_cols).forEach((col) => {
        let minVal, maxVal;
        const filterLimits = tool.data[tool.dataset].filter_limits;

        // If filter_limits exists, and has the necessary range for the current col
        if (filterLimits && filterLimits[col]) {
          [minVal, maxVal] = filterLimits[col];
        } else {
          // Compute min and max from data if not provided in filter_limits
          minVal = d3.min(tool.data[tool.dataset].mut_metric_df, (d) => d[col]);
          maxVal = d3.max(tool.data[tool.dataset].mut_metric_df, (d) => d[col]);
        }

        // Add the filter to the page
        tool.initFilter(
          col,
          tool.data[tool.dataset].filter_cols[col],
          minVal,
          maxVal,
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
    // If value is a string, convert to a number
    if (typeof value === "string") {
      value = parseFloat(value);
    }
    // Set the attributes of the range input
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
   * Handle updates to the selected dataset
   */
  updateSelectedDataset(node) {
    let tool = this;
    // Update the dataset selection in the chart, protein, and legend
    tool.dataset = d3.select(node).property("value");
    tool.chart.config.dataset = tool.dataset;
    tool.protein.config.dataset = tool.dataset;
    tool.legend.config.dataset = tool.dataset;
    // Update the condition selection because datasets have different conditions
    tool.chartConditions = tool.data[tool.dataset].conditions;
    tool.proteinCondition = tool.chartConditions[0];
    tool.chart.config.chartConditions = tool.chartConditions;
    tool.legend.config.chartConditions = tool.chartConditions;
    tool.protein.config.proteinCondition = tool.proteinCondition;
    tool.legend.config.proteinCondition = tool.proteinCondition;
    // Update the description in the UI based on the dataset
    tool.datasetDescription =
      tool.data[tool.dataset].description ||
      "A description wasn't provided for this dataset.";
    tool.uiInstance.datasetDescription = tool.datasetDescription;
    // If the desciption alert is open, update the text
    if (!d3.select("#alertBanner").classed("hidden")) {
      d3.select("#alertMessage").text(tool.datasetDescription);
    }
    // Update the filters
    tool.filters = {};
    if (tool.data[tool.dataset].filter_cols) {
      tool.filters = Object.keys(tool.data[tool.dataset].filter_cols).reduce(
        (acc, key) => ({
          ...acc,
          [key]: d3.min(tool.data[tool.dataset].mut_metric_df, (e) => e[key]),
        }),
        {}
      );
    }
    // Populate Filter Sites
    d3.select("#filters").html("");
    if (tool.data[tool.dataset].filter_cols) {
      Object.keys(tool.data[tool.dataset].filter_cols).forEach((col) => {
        let minVal, maxVal;
        const filterLimits = tool.data[tool.dataset].filter_limits;

        // If filter_limits exists, and has the necessary range for the current col
        if (filterLimits && filterLimits[col]) {
          [minVal, maxVal] = filterLimits[col];
        } else {
          // Compute min and max from data if not provided in filter_limits
          minVal = d3.min(tool.data[tool.dataset].mut_metric_df, (d) => d[col]);
          maxVal = d3.max(tool.data[tool.dataset].mut_metric_df, (d) => d[col]);
        }

        // Add the filter to the page
        tool.initFilter(
          col,
          tool.data[tool.dataset].filter_cols[col],
          minVal,
          maxVal,
          tool.filters[col]
        );
      });
    }
    tool.chart.config.filters = tool.filters;

    // Update the chart and deselect all sites
    tool.chart.deselectSites();
    tool.chart.updateVis();
    tool.legend.updateLegend();

    // Only update the protein if the structure has changed or the chains have changed
    console.log(tool.data[tool.dataset]);
    if (tool.data[tool.dataset].pdb !== tool.protein.config.pdbID) {
      tool.protein.config.pdbID = tool.data[tool.dataset].pdb;
      tool.protein.clear();
      tool.protein.load();
    } else if (
      JSON.stringify(tool.data[tool.dataset].dataChains) !==
      JSON.stringify(tool.protein.config.dataChains)
    ) {
      // If pdb is the same but dataChains are different, just reload
      tool.protein.clear();
      tool.protein.load();
    }

    tool.updateURLParams();
  }
  /**
   * Handle updates within a single dataset
   */
  updateChartOptions(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const id = selection.attr("id");
    const value = selection.property(
      id == "floor" || id == "mutations" ? "checked" : "value"
    );

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
    let value = selection.property("value");
    if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    }

    // If the `id` is the protein selection check if it conflicts with the selection
    if (id === "proteinRepresentation") {
      // Representations that conflict with one another
      const conflictingRepresentations = new Map([
        [
          "surface",
          new Set(["spacefill", "surface", "cartoon", "rope", "ball+stick"]),
        ],
        [
          "spacefill",
          new Set(["spacefill", "surface", "cartoon", "rope", "ball+stick"]),
        ],
        ["cartoon", new Set(["cartoon", "rope"])],
        ["rope", new Set(["cartoon", "rope"])],
        ["ball+stick", new Set(["ball+stick"])],
      ]);

      const conflicts = conflictingRepresentations.get(value);

      if (
        conflicts &&
        conflicts.has(tool.protein.config.selectionRepresentation)
      ) {
        const alert = new Alerts();
        alert.showAlert(
          `The current representation of the selection (${tool.protein.config.selectionRepresentation}) may be obscured by the ${tool.protein.config.proteinRepresentation} representation of the protein. Consider toggling the opacity of the protein representation.`,
          "warning"
        );
      }
    }

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
  updateProteinCondition(condition) {
    let tool = this;

    // Update the config
    tool.proteinCondition = condition;
    tool.protein.config.proteinCondition = condition;

    // Update the chart and protein
    tool.protein.updateData();

    tool.updateURLParams();
  }
  /**
   * Handle updates to which eptiopes are displayed on the chart
   */
  updateChartConditions(conditions) {
    let tool = this;

    // Update the config
    tool.chartConditions = conditions;
    tool.chart.config.chartConditions = conditions;

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
  setState() {
    let tool = this;

    // Defaults for the tool's state
    tool.defaultParams = {
      dataset: { abbrev: "e", default: tool.dataset, json: false },
      proteinCondition: {
        abbrev: "pe",
        default: tool.data[tool.dataset].conditions[0],
        json: false,
      },
      chartConditions: {
        abbrev: "ce",
        default: tool.data[tool.dataset].conditions,
        json: true,
      },
      summary: { abbrev: "s", default: "sum", json: false },
      floor: { abbrev: "f", default: false, json: false },
      mutations: { abbrev: "m", default: false, json: false },
      proteinRepresentation: { abbrev: "pr", default: "cartoon", json: false },
      selectionRepresentation: {
        abbrev: "sr",
        default: "spacefill",
        json: false,
      },
      backgroundRepresentation: { abbrev: "br", default: "rope", json: false },
      ligandRepresentation: { abbrev: "lr", default: "spacefill", json: false },
      proteinColor: { nabbrevame: "pc", default: "#d3d3d3", json: false },
      backgroundColor: { abbrev: "bc", default: "#d3d3d3", json: false },
      ligandColor: { abbrev: "lc", default: "#d3d3d3", json: false },
      ligandElement: { abbrev: "le", default: false, json: false },
      proteinElement: { abbrev: "pce", default: false, json: false },
      proteinOpacity: { abbrev: "po", default: "1", json: false },
      selectionOpacity: { abbrev: "so", default: "1", json: false },
      backgroundOpacity: { abbrev: "bo", default: "1", json: false },
      showGlycans: { abbrev: "g", default: false, json: false },
      showNucleotides: { abbrev: "n", default: false, json: false },
      showNonCarbonHydrogens: { abbrev: "h", default: false, json: false },
      filters: {
        abbrev: "fi",
        default: tool.data[tool.dataset].filter_cols
          ? Object.keys(tool.data[tool.dataset].filter_cols).reduce(
              (acc, key) => ({
                ...acc,
                [key]: d3.min(
                  tool.data[tool.dataset].mut_metric_df,
                  (e) => e[key]
                ),
              }),
              {}
            )
          : {},
        json: true,
      },
    };

    // Get the URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Set the parameters from the URL or the default
    for (const parameter in tool.defaultParams) {
      if (urlParams.has(tool.defaultParams[parameter].abbrev)) {
        if (tool.defaultParams[parameter].json) {
          let value = JSON.parse(
            decodeURIComponent(
              urlParams.get(tool.defaultParams[parameter].abbrev)
            )
          );
          tool[parameter] = value;
        } else {
          let value = urlParams.get(tool.defaultParams[parameter].abbrev);
          if (value === "true") {
            tool[parameter] = true;
          } else if (value === "false") {
            tool[parameter] = false;
          } else {
            tool[parameter] = value;
          }
        }
      } else {
        if (typeof tool.defaultParams[parameter].default === "object") {
          // Make a copy if the default is an object
          tool[parameter] = cloneDeep(tool.defaultParams[parameter].default);
        } else {
          tool[parameter] = tool.defaultParams[parameter].default;
        }
      }
    }
  }
  /**
   * Update the URL parameters when the state changes
   */
  updateURLParams() {
    let tool = this;

    // Get the URL parameters object
    const urlParams = new URLSearchParams(window.location.search);

    // If the data parameter is not in the URL no need to update
    if (!urlParams.has("data")) {
      return;
    }

    // Update the URL parameters if they are different from the defaults
    for (const parameter in tool.defaultParams) {
      const name = tool.defaultParams[parameter].abbrev;
      const currentValue = tool[parameter];
      const defaultValue = tool.defaultParams[parameter].default;

      // If the current value is different from the default, update the URL
      if (!isEqual(currentValue, defaultValue)) {
        // If the value is should be as JSON, stringify it and encode it
        if (tool.defaultParams[parameter].json) {
          urlParams.set(name, encodeURIComponent(JSON.stringify(currentValue)));
        } else {
          urlParams.set(name, currentValue);
        }
        continue;
      }

      // If the current value is the same as the default, remove it from the URL if it exists
      if (urlParams.has(name)) {
        urlParams.delete(name);
      }
    }
    // Update the URL with the new parameters
    window.history.replaceState({}, "", `${location.pathname}?${urlParams}`);
  }
}
