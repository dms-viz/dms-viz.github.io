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
      epitope: _config.epitope,
      name: _config.name || "epitope",
    };
    // Data is a deep copy of the data
    this.data = JSON.parse(JSON.stringify(_data));
    // Selected epitopes
    this.chartEpitopes = [];
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

    // Add all of the avalible epitopes to the chartEpitopes
    vis.chartEpitopes = vis.epitopes;

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
      .selectAll(".epitope-box")
      .data(vis.epitopes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "epitope-box")
            .attr("x", vis.margin.left - vis.margin.point / 2)
            .attr("y", (d, i) => vis.margin.top - 10 + i * vis.margin.point)
            .attr("width", vis.background.node().getBBox().width - 20)
            .attr("height", 20)
            .style("opacity", 0)
            .attr("ry", 4)
            .style("fill", (d) => vis.epitopeColors[d])
            .on("click", (event, datum) => {
              if (event.altKey && vis.chartEpitopes.includes(datum)) {
                vis.deselectChartEpitopes(datum);
              } else if (event.altKey && !vis.chartEpitopes.includes(datum)) {
                vis.selectChartEpitopes(datum);
              } else {
                vis.selectProteinEpitope(datum);
              }
            }),
        (update) =>
          update
            // Attributes that need to be updated go here
            .attr("y", (d, i) => vis.margin.top - 10 + i * vis.margin.point)
            .style("fill", (d) => vis.epitopeColors[d]),
        (exit) => exit.remove()
      );

    // Highlight the selected epitope by default
    vis.legend
      .selectAll(".epitope-box")
      .filter(function (d) {
        return d == vis.config.epitope;
      })
      .style("opacity", ".25")
      .classed("selected-epitope", true);

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll(".epitope-circle")
      .data(vis.epitopes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "epitope-circle")
            .attr("cx", vis.margin.left)
            .attr("cy", (d, i) => vis.margin.top + i * vis.margin.point)
            .attr("r", 7)
            .style("fill", (d) => vis.epitopeColors[d])
            .on("click", (event, datum) => {
              if (event.altKey && vis.chartEpitopes.includes(datum)) {
                vis.deselectChartEpitopes(datum);
              } else if (event.altKey && !vis.chartEpitopes.includes(datum)) {
                vis.selectChartEpitopes(datum);
              } else {
                vis.selectProteinEpitope(datum);
              }
            }),
        (update) =>
          update
            .attr("cy", (d, i) => vis.margin.top + i * vis.margin.point)
            .style("fill", (d) => vis.epitopeColors[d]),
        (exit) => exit.remove()
      );

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll(".epitope-label")
      .data(vis.epitopes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "epitope-label")
            .attr("x", vis.margin.left * 2)
            .attr("y", (d, i) => vis.margin.top + i * vis.margin.point)
            .text((d) => `${vis.config.name} ${d}`)
            .style("fill", (d) => vis.epitopeColors[d])
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
            .style("user-select", "none")
            .on("click", (event, datum) => {
              if (event.altKey && vis.chartEpitopes.includes(datum)) {
                vis.deselectChartEpitopes(datum);
              } else if (event.altKey && !vis.chartEpitopes.includes(datum)) {
                vis.selectChartEpitopes(datum);
              } else {
                vis.selectProteinEpitope(datum);
              }
            }),
        (update) =>
          update
            .attr("y", (d, i) => vis.margin.top + i * vis.margin.point)
            .text((d) => `${vis.config.name} ${d}`)
            .style("fill", (d) => vis.epitopeColors[d]),
        (exit) => exit.remove()
      );
  }
  selectProteinEpitope(datum) {
    let vis = this;

    // If the selected epitope isn't in the chart selection, don't do anything
    if (!vis.chartEpitopes.includes(datum)) {
      return;
    }

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
    vis.config.epitope = datum;

    // Dispatch an event to notify about the selected epitope
    const proteinEpitopeEvent = new CustomEvent("proteinEpitopeSelected", {
      detail: vis.config.epitope,
    });
    window.dispatchEvent(proteinEpitopeEvent);
  }
  selectChartEpitopes(datum) {
    let vis = this;

    // Color the text labels back in
    vis.legend
      .selectAll(".epitope-label")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", "1");

    // Color the points back in
    vis.legend
      .selectAll(".epitope-circle")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", "1");

    // Add this epitope to the selected epitopes
    vis.chartEpitopes.push(datum);

    // Dispatch an event to notify about the plot epitopes
    const chartEpitopeEvent = new CustomEvent("chartEpitopesSelected", {
      detail: vis.chartEpitopes,
    });
    window.dispatchEvent(chartEpitopeEvent);
  }
  deselectChartEpitopes(datum) {
    let vis = this;

    // If this is the last epitope, don't deselect it
    if (vis.chartEpitopes.length == 1) {
      return;
    }

    // Remove this epitope from the selected epitopes
    vis.chartEpitopes = vis.chartEpitopes.filter(function (d) {
      return d != datum;
    });

    // If this epitope is highlighted, remove the highlight and move it to the next epitope in the list
    if (vis.config.epitope == datum) {
      vis.selectProteinEpitope(vis.chartEpitopes[0]);
    }

    // Add opacity to the text labels and points
    vis.legend
      .selectAll(".epitope-label")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", ".25");

    vis.legend
      .selectAll(".epitope-circle")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", ".25");

    // Dispatch an event to notify about the plot epitopes
    const chartEpitopeEvent = new CustomEvent("chartEpitopesSelected", {
      detail: vis.chartEpitopes,
    });
    window.dispatchEvent(chartEpitopeEvent);
  }
}
