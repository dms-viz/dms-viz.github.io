/* Making a class to hold the legend code inspried by https://www.cs.ubc.ca/~tmm/courses/436V-20/reading/reusable_d3_components.pdf */
import * as d3 from "d3";

export class Legend {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Object}
   */
  constructor(_config, _data) {
    this.config = _config;
    this.config = {
      parentElement: _config.parentElement,
      experiment: _config.experiment,
      name: _config.name || "epitope",
    };
    // Data is a deep copy of the data
    this.data = JSON.parse(JSON.stringify(_data));
    // Selected epitopes
    this.proteinEpitope = _config.proteinEpitope;
    this.plotEpitopes = [];
    // Initialize the visualization
    this.initVis();
  }
  // Initialize the visualization
  initVis() {
    let vis = this;

    // Set up the margins
    vis.margin = {
      left: 20,
      top: 20,
      bottom: 20,
      point: 25,
    };

    // Set up the SVG
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", "100%");

    // Draw a rectangle backgound for the legend
    vis.background = vis.svg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", "100%")
      .attr("fill", "white")
      .attr("ry", 10);

    // Make the legend
    vis.legend = vis.svg.append("g").attr("class", "condition-legend");

    vis.updateVis();
  }
  updateVis() {
    let vis = this;

    // Get the available epitopes and colors
    vis.epitopes = Object.keys(vis.data[vis.config.experiment].epitope_colors);

    // Epitope colors
    vis.epitopeColors = vis.data[vis.config.experiment].epitope_colors;

    // Set the height based on the number of elements
    vis.config.height =
      (vis.epitopes.length - 1) * vis.margin.point +
      vis.margin.top +
      vis.margin.bottom;
    vis.svg.attr("height", vis.config.height);
    vis.background.attr("height", vis.config.height);

    vis.renderVis();
  }
  renderVis() {
    let vis = this;

    // Add a highlight-box for each epitope and set the visibility to hidden
    vis.legend
      .selectAll("epitope-boxes")
      .data(vis.epitopes)
      .enter()
      .append("rect")
      .attr("class", "epitope-box")
      .attr("x", vis.margin.left - vis.margin.point / 2)
      .attr("y", function (d, i) {
        return vis.margin.top - 10 + i * vis.margin.point;
      })
      .attr("width", vis.background.node().getBBox().width - 20)
      .attr("height", 20)
      .style("opacity", 0)
      .attr("ry", 4)
      .style("fill", function (d) {
        return vis.epitopeColors[d];
      })
      .on("click", function (event, datum) {
        vis.selectProteinEpitope(event, datum);
      });

    // Highlight the selected epitope by default
    vis.legend
      .selectAll(".epitope-box")
      .filter(function (d) {
        return d == vis.proteinEpitope;
      })
      .style("opacity", ".25")
      .classed("selected-epitope", true);

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll("epitopes")
      .data(vis.epitopes)
      .enter()
      .append("circle")
      .attr("cx", vis.margin.left)
      .attr("cy", function (d, i) {
        return vis.margin.top + i * vis.margin.point;
      })
      .attr("r", 7)
      .style("fill", function (d) {
        return vis.epitopeColors[d];
      })
      .on("click", function (event, datum) {
        vis.selectProteinEpitope(event, datum);
      })
      .classed("selected-epitope", true);

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll("eptiope-labels")
      .data(vis.epitopes)
      .enter()
      .append("text")
      .attr("x", vis.margin.left * 2)
      .attr("y", function (d, i) {
        return vis.margin.top + i * vis.margin.point;
      })
      .text(function (d) {
        return `${vis.config.name} ${d}`;
      })
      .style("fill", function (d) {
        return vis.epitopeColors[d];
      })
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")
      .style("user-select", "none")
      .on("click", function (event, datum) {
        vis.selectProteinEpitope(event, datum);
      })
      .classed("selected-epitope", true);
  }
  selectProteinEpitope(event, datum) {
    let vis = this;

    // First, hide all other boxes
    vis.legend
      .selectAll(".epitope-box")
      .style("opacity", "0")
      .classed("selected-epitope", false);

    // Select the box with the same epitope as the clicked box
    vis.legend
      .selectAll(".epitope-box")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", ".25")
      .classed("selected-epitope", true);

    // Update the selected epitope
    vis.proteinEpitope = datum;

    // Dispatch an event to notify about the selected epitope
    const proteinEpitopeEvent = new CustomEvent("proteinEpitopeSelected", {
      detail: vis.proteinEpitope,
    });
    window.dispatchEvent(proteinEpitopeEvent);
  }
  // selectChartEpitopes(datum) {
  //   let vis = this;

  //   console.log(datum);
  // }
  // deselectChartEpitopes(datum) {
  //   let vis = this;

  //   console.log(datum);
  // }
}
