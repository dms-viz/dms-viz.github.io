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
      dataset: _config.dataset,
      proteinEpitope: _config.proteinEpitope,
      chartEpitopes: _config.chartEpitopes,
      name: _config.name || "epitope",
    };
    // Data is a deep copy of the data
    this.data = JSON.parse(JSON.stringify(_data));
    // Initialize the visualization
    this.initVis();
  }
  // Initialize the visualization
  initVis() {
    let vis = this;

    // Clear any existing legend
    document.querySelector(this.config.parentElement).innerHTML = "";

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

    // Get all epitopes as the data for the legend
    vis.allEpitopes = Object.keys(vis.data[vis.config.dataset].epitope_colors);

    // Epitope colors
    vis.epitopeColors = vis.data[vis.config.dataset].epitope_colors;

    // Set the height based on the number of elements
    vis.config.height =
      (vis.allEpitopes.length - 1) * vis.margin.point +
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
      .data(vis.allEpitopes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "epitope-box")
            .attr("x", vis.margin.left - vis.margin.point / 2)
            .attr("y", (d, i) => vis.margin.top - 10 + i * vis.margin.point)
            .attr("width", "calc(100% - 20px)")
            .attr("height", 20)
            .style("opacity", (d) =>
              vis.config.proteinEpitope.includes(d) ? ".25" : "0"
            )
            .attr("ry", 4)
            .style("fill", (d) => vis.epitopeColors[d])
            .on("click", (event, datum) => {
              if (event.altKey && vis.config.chartEpitopes.includes(datum)) {
                vis.deselectChartEpitopes(datum);
              } else if (
                event.altKey &&
                !vis.config.chartEpitopes.includes(datum)
              ) {
                vis.selectChartEpitopes(datum);
              } else {
                vis.selectProteinEpitope(datum);
              }
            }),
        (update) =>
          update
            // Attributes that need to be updated go here
            .attr("y", (d, i) => vis.margin.top - 10 + i * vis.margin.point)
            .style("fill", (d) => vis.epitopeColors[d])
            .style("opacity", (d) =>
              vis.config.proteinEpitope.includes(d) ? ".25" : "0"
            ),
        (exit) => exit.remove()
      );

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll(".epitope-circle")
      .data(vis.allEpitopes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "epitope-circle")
            .attr("cx", vis.margin.left)
            .attr("cy", (d, i) => vis.margin.top + i * vis.margin.point)
            .attr("r", 7)
            .style("fill", (d) => vis.epitopeColors[d])
            .style("opacity", (d) =>
              vis.config.chartEpitopes.includes(d) ? "1" : "0.2"
            )
            .on("click", (event, datum) => {
              if (event.altKey && vis.config.chartEpitopes.includes(datum)) {
                vis.deselectChartEpitopes(datum);
              } else if (
                event.altKey &&
                !vis.config.chartEpitopes.includes(datum)
              ) {
                vis.selectChartEpitopes(datum);
              } else {
                vis.selectProteinEpitope(datum);
              }
            }),
        (update) =>
          update
            .attr("cy", (d, i) => vis.margin.top + i * vis.margin.point)
            .style("fill", (d) => vis.epitopeColors[d])
            .style("opacity", (d) =>
              vis.config.chartEpitopes.includes(d) ? "1" : "0.2"
            ),
        (exit) => exit.remove()
      );

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll(".epitope-label")
      .data(vis.allEpitopes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "epitope-label")
            .attr("x", vis.margin.left * 2)
            .attr("y", (d, i) => vis.margin.top + i * vis.margin.point)
            .text((d) => `${vis.config.name} ${d}`)
            .style("fill", (d) => vis.epitopeColors[d])
            .style("opacity", (d) =>
              vis.config.chartEpitopes.includes(d) ? "1" : "0.2"
            )
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
            .attr("dominant-baseline", "middle")
            .style("user-select", "none")
            .on("click", (event, datum) => {
              if (event.altKey && vis.config.chartEpitopes.includes(datum)) {
                vis.deselectChartEpitopes(datum);
              } else if (
                event.altKey &&
                !vis.config.chartEpitopes.includes(datum)
              ) {
                vis.selectChartEpitopes(datum);
              } else {
                vis.selectProteinEpitope(datum);
              }
            }),
        (update) =>
          update
            .attr("y", (d, i) => vis.margin.top + i * vis.margin.point)
            .text((d) => `${vis.config.name} ${d}`)
            .style("fill", (d) => vis.epitopeColors[d])
            .style("opacity", (d) =>
              vis.config.chartEpitopes.includes(d) ? "1" : "0.2"
            ),
        (exit) => exit.remove()
      );
  }
  selectProteinEpitope(datum) {
    let vis = this;

    // If the selected epitope isn't in the chart selection, don't do anything
    if (!vis.config.chartEpitopes.includes(datum)) {
      return;
    }

    // First, hide all other boxes
    vis.legend.selectAll(".epitope-box").style("opacity", "0");

    // Select the box with the same epitope as the clicked box
    vis.legend
      .selectAll(".epitope-box")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", ".25");
    // Update the selected epitope
    vis.config.proteinEpitope = datum;

    // Dispatch an event to notify about the selected epitope
    const proteinEpitopeEvent = new CustomEvent("proteinEpitopeSelected", {
      detail: vis.config.proteinEpitope,
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
    vis.config.chartEpitopes.push(datum);

    // Dispatch an event to notify about the plot epitopes
    const chartEpitopeEvent = new CustomEvent("chartEpitopesSelected", {
      detail: vis.config.chartEpitopes,
    });
    window.dispatchEvent(chartEpitopeEvent);
  }
  deselectChartEpitopes(datum) {
    let vis = this;

    // If this is the last epitope, don't deselect it
    if (vis.config.chartEpitopes.length == 1) {
      return;
    }

    // Remove this epitope from the selected epitopes
    vis.config.chartEpitopes = vis.config.chartEpitopes.filter(function (d) {
      return d != datum;
    });

    // If this epitope is highlighted, remove the highlight and move it to the next epitope in the list
    if (vis.config.proteinEpitope == datum) {
      vis.selectProteinEpitope(vis.config.chartEpitopes[0]);
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
      detail: vis.config.chartEpitopes,
    });
    window.dispatchEvent(chartEpitopeEvent);
  }
}
