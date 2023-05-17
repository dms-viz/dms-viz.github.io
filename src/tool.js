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

    // Grab the filters div by ID and remove the inner HTML
    d3.select("#filters").html("");

    // Format the JSON data
    tool._formatData();

    // Get the available experiments
    tool.experiments = Object.keys(tool.data);

    // Set the default selections
    tool.experiment = tool.experiments[0];
    tool.epitopes = tool.data[tool.experiment].epitopes.map((d) =>
      d.toString()
    );
    tool.epitope = tool.data[tool.experiment].epitopes[0].toString();
    tool.summary = "sum";
    tool.floor = true;
    tool.pdb = tool.data[tool.experiment].pdb;
    tool.metric = tool.data[tool.experiment].metric_col;

    // Columns to filter on
    tool.filterCols = tool.data[tool.experiment].filter_cols;

    // Columns to use a tooltips
    tool.tooltipCols = tool.data[tool.experiment].tooltip_cols;

    // Set up the chart selection menus
    tool._updateSelection(d3.select("#experiment"), tool.experiments);
    tool._updateSelection(d3.select("#summary"), ["sum", "mean", "max", "min"]);
    // Set up the protein selection menus
    tool._updateSelection(d3.select("#proteinRepresentation"), [
      "cartoon",
      "rope",
      "ball+stick",
    ]);
    tool._updateSelection(d3.select("#selectionRepresentation"), [
      "spacefill",
      "surface",
    ]);
    tool._updateSelection(d3.select("#backgroundRepresentation"), [
      "rope",
      "cartoon",
      "ball+stick",
    ]);

    // Add the sliders for the filters
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
        tool._updateSlider(
          d3.select(`#${col}`),
          ...colRange,
          colRange[0],
          (colRange[1] - colRange[0]) / 100
        );
        document.getElementById(`${col}-output`).textContent = d3.format(".2f")(
          colRange[0]
        );
      });
    }

    // Add an event listener to the sliders
    if (tool.filterCols) {
      Object.keys(tool.filterCols).forEach((col) => {
        document.getElementById(col).addEventListener("input", function () {
          // Filter the chart data based on the range input
          tool.filterData(this);
        });
      });
    }

    // Set up the initial chart
    document.getElementById("chart").innerHTML = "";
    d3.selectAll(".tooltip").remove();
    tool.chart = new Chart(
      {
        experiment: tool.experiment,
        epitopes: tool.epitopes,
        summary: tool.summary,
        floor: tool.floor,
        metric: tool.metric,
        tooltips: tool.tooltipCols,
        parentElement: "#chart",
      },
      tool.data
    );

    // Set up the initial protein
    document.getElementById("viewport").innerHTML = "";
    tool.protein = new Protein(
      {
        parentElement: "viewport",
        experiment: tool.experiment,
        epitope: tool.epitope,
        summary: tool.summary,
        floor: tool.floor,
        pdbID: tool.pdb,
        dispatch: tool.chart.dispatch,
      },
      tool.data
    );

    // Set up the legend if there are more than one epitope
    if (tool.epitopes.length > 1) {
      tool.legend = new Legend(
        {
          parentElement: "#legend",
          experiment: tool.experiment,
          proteinEpitope: tool.epitope,
        },
        tool.data
      );
    }
  }
  /**
   * Handle updates to the experiment selection
   */
  updateExperiment(node) {
    let tool = this;
    // Update the experiment selection in the chart and protein
    tool.experiment = d3.select(node).property("value");
    tool.chart.config.experiment = tool.experiment;
    tool.protein.config.experiment = tool.experiment;
    // Update the epitope selection because experiments have different epitopes
    tool.epitope = tool.data[tool.experiment].epitopes[0];
    tool.chart.config.epitope = tool.epitope;
    tool.protein.config.epitope = tool.epitope;
    // Update the pdb structure since this is also experiment specific
    tool.pdb = tool.data[tool.experiment].pdb;
    tool.protein.config.pdbID = tool.pdb;
    // Update the chart and deselect all sites
    tool.chart.deselectSites();
    tool.chart.updateVis();

    // Set a timeout to make sure the chart has been updated
    // This prevents the odd loading issue with the protein on Chrome
    setTimeout(() => {
      tool.protein.clear();
    }, 100);
  }
  /**
   * Handle updates within a single experiment
   */
  updateData(node) {
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
  }
  updateEpitope(epitope) {
    let tool = this;

    // Update the config
    tool["epitope"] = epitope;
    tool.protein.config["epitope"] = epitope;

    // Update the chart and protein
    tool.protein.makeColorScheme();
  }
  updateEpitopes(epitopes) {
    let tool = this;

    // Update the config
    tool["epitopes"] = epitopes;
    tool.chart.config["epitopes"] = epitopes;

    // Update the chart and protein
    tool.chart.updateVis();
  }
  /**
   * Filter the data based on the range of times seen
   */
  filterData(node) {
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
   * Handle updates to the protein representation
   */
  updateProtein(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const id = selection.attr("id");
    const value = selection.property(id == "showGlycans" ? "checked" : "value");

    // Update the config
    tool.protein.config[id] = value;

    // Update the chart and protein
    tool.protein.clear();
  }
  /**
   * Format the data
   */
  _formatData() {
    let tool = this;

    // Format data for each antibody experiment
    for (const selection in tool.data) {
      // Get the epitopes for the experiment and convert to strings
      tool.data[selection].epitopes = tool.data[selection].epitopes.map((e) =>
        e.toString()
      );
      // Get the map for reference sites to sequential sites
      const siteMap = tool.data[selection].sitemap;
      // Get the column name of the mutation-level metric
      const metric = tool.data[selection].metric_col;
      // Map the reference sites to sequential and protein sites
      tool.data[selection].mut_metric_df = tool.data[
        selection
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
  }
  /**
   * Update the selection menu
   */
  _updateSelection(selection, options) {
    selection
      .selectAll("option")
      .data(options)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d);
  }
  /**
   * Update the slider
   */
  _updateSlider(selection, min, max, start, step) {
    selection
      .attr("min", min)
      .attr("max", max)
      .attr("value", start)
      .attr("step", step);
  }
}
