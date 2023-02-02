import * as d3 from "d3";
import { Chart } from "./chart.js";
import { Protein } from "./protein.js";

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

    // Format the JSON data
    tool._formatData();

    // Get the available models
    tool.models = Object.keys(tool.data);

    // Set the default selections
    tool.model = tool.models[0];
    tool.epitope = tool.data[tool.model].epitopes[0].toString();
    tool.metric = "sum";
    tool.floor = true;
    tool.pdb = tool.data[tool.model].pdb;

    // Set up the chart selection menus
    tool._updateSelection(d3.select("#model"), tool.models);
    tool._updateSelection(
      d3.select("#epitope"),
      tool.data[tool.model].epitopes
    );
    tool._updateSelection(d3.select("#metric"), ["sum", "mean", "max", "min"]);
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

    // Testing the filters and update the sliders
    // Get the min and max values for times seen from mut_escape_df
    const timesSeen = d3.extent(
      tool.data[tool.model].mut_escape_df,
      (d) => d.times_seen
    );
    tool._updateSlider(d3.select("#times_seen"), ...timesSeen, 0, 1);

    // Set up the initial chart
    document.getElementById("chart").innerHTML = "";
    d3.selectAll(".tooltip").remove();
    tool.chart = new Chart(
      {
        model: tool.model,
        epitope: tool.epitope,
        metric: tool.metric,
        floor: tool.floor,
        parentElement: "#chart",
      },
      tool.data
    );

    // Set up the initial protein
    document.getElementById("viewport").innerHTML = "";
    tool.protein = new Protein(
      {
        parentElement: "viewport",
        model: tool.model,
        epitope: tool.epitope,
        metric: tool.metric,
        floor: tool.floor,
        pdbID: tool.pdb,
        dispatch: tool.chart.dispatch,
      },
      tool.data
    );

    tool.proteinLoaded = tool.protein.dispatch;
  }
  /**
   * Handle updates to the model selection
   */
  updateModel(node) {
    let tool = this;
    // Update the model selection in the chart and protein
    tool.model = d3.select(node).property("value");
    tool.chart.config.model = tool.model;
    tool.protein.config.model = tool.model;
    // Update the epitope selection because models have different epitopes
    tool.epitope = tool.data[tool.model].epitopes[0];
    tool.chart.config.epitope = tool.epitope;
    tool.protein.config.epitope = tool.epitope;
    // Update the pdb structure since this is also model specific
    tool.pdb = tool.data[tool.model].pdb;
    tool.protein.config.pdbID = tool.pdb;
    // Update the epitope selection menu
    tool._updateSelection(
      d3.select("#epitope"),
      tool.data[tool.model].epitopes
    );

    tool.chart.updateVis();

    // Set a timeout to make sure the chart has been updated
    // This prevents the odd loading issue with the protein on Chrome
    setTimeout(() => {
      tool.protein.clear();
    }, 100);
  }
  /**
   * Handle updates within a single model
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
  /**
   * Filter the data based on the range of times seen
   */
  filterData(node) {
    let tool = this;
    // Get the value of the slider
    const value = parseInt(d3.select(node).property("value"));
    const filterData = tool.data[tool.model].mut_escape_df.filter(
      (d) => d.times_seen >= value
    );

    tool.chart.data[tool.model].mut_escape_df = filterData;

    // Update the chart
    tool.chart.updateVis();
  }
  /**
   * Handle updates to the protein representation
   */
  updateProtein(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const id = selection.attr("id");
    const value = selection.property("value");

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

    // Format data for each antibody model
    for (const selection in tool.data) {
      // Get the epitopes for the model and convert to strings
      tool.data[selection].epitopes = tool.data[selection].epitopes.map((e) =>
        e.toString()
      );
      // Get the map for reference sites to sequential sites
      const siteMap = tool.data[selection].sitemap;
      // Map the reference sites to sequential and protein sites
      tool.data[selection].mut_escape_df = tool.data[
        selection
      ].mut_escape_df.map((e) => {
        return {
          ...e,
          site: siteMap[e.site].sequential_site,
          site_reference: e.site,
          site_protein: siteMap[e.site].protein_site,
          site_chain: siteMap[e.site].chains,
          escape: e.escape_mean,
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
