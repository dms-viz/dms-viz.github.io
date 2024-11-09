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
      proteinCondition: _config.proteinCondition,
      chartConditions: _config.chartConditions,
      label: _config.label || "Condition",
    };
    // Data is a deep copy of the data
    this.data = JSON.parse(JSON.stringify(_data));
    // Initialize the visualization
    this.initLegend();
  }
  // Initialize the visualization
  initLegend() {
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

    vis.updateLegend();
  }
  updateLegend() {
    let vis = this;

    // If the are no conditions, don't do anything and set the display to none
    if (!vis.data[vis.config.dataset].legend) {
      document.getElementById("condition-option").style.display = "none";
      return;
    } else {
      // Select the label element inside the div with id 'condition-option'
      const label = document.querySelector("#condition-option label");
      label.textContent = vis.config.label;
      document.getElementById("condition-option").style.display = "block";
    }

    // Get all conditions as the data for the legend
    vis.allConditions = Object.keys(
      vis.data[vis.config.dataset].condition_colors
    );

    // Condition colors
    vis.conditionColors = vis.data[vis.config.dataset].condition_colors;

    // Set the height based on the number of elements
    vis.config.height =
      (vis.allConditions.length - 1) * vis.margin.point +
      vis.margin.top +
      vis.margin.bottom;
    vis.svg.attr("height", vis.config.height);
    vis.background.attr("height", vis.config.height);

    vis.renderLegend();
  }
  renderLegend() {
    let vis = this;

    // Add a highlight-box for each condition and set the visibility to hidden
    vis.legend
      .selectAll(".condition-box")
      .data(vis.allConditions, (d) => d)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "condition-box")
            .attr("x", vis.margin.left - vis.margin.point / 2)
            .attr("y", (d, i) => vis.margin.top - 10 + i * vis.margin.point)
            .attr("width", "calc(100% - 20px)")
            .attr("height", 20)
            .style("opacity", (d) =>
              vis.config.proteinCondition.includes(d) ? ".25" : "0"
            )
            .attr("ry", 4)
            .style("fill", (d) => vis.conditionColors[d])
            .on("click", (event, datum) => {
              if (event.altKey && vis.config.chartConditions.includes(datum)) {
                requestAnimationFrame(() => vis.deselectChartConditions(datum));
              } else if (
                event.altKey &&
                !vis.config.chartConditions.includes(datum)
              ) {
                requestAnimationFrame(() => vis.selectChartConditions(datum));
              } else {
                requestAnimationFrame(() => vis.selectProteinCondition(datum));
              }
            })
            .on("dblclick", (event, datum) => {
              requestAnimationFrame(() =>
                vis.clearAndSelectSingleCondition(datum)
              );
            }),
        (update) =>
          update
            // Attributes that need to be updated go here
            .attr("y", (d, i) => vis.margin.top - 10 + i * vis.margin.point)
            .style("fill", (d) => vis.conditionColors[d])
            .style("opacity", (d) =>
              vis.config.proteinCondition.includes(d) ? ".25" : "0"
            ),
        (exit) => exit.remove()
      );

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll(".condition-circle")
      .data(vis.allConditions, (d) => d)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "condition-circle")
            .attr("cx", vis.margin.left)
            .attr("cy", (d, i) => vis.margin.top + i * vis.margin.point)
            .attr("r", 7)
            .style("fill", (d) => vis.conditionColors[d])
            .style("opacity", (d) =>
              vis.config.chartConditions.includes(d) ? "1" : "0.2"
            )
            .on("click", (event, datum) => {
              if (event.altKey && vis.config.chartConditions.includes(datum)) {
                requestAnimationFrame(() => vis.deselectChartConditions(datum));
              } else if (
                event.altKey &&
                !vis.config.chartConditions.includes(datum)
              ) {
                requestAnimationFrame(() => vis.selectChartConditions(datum));
              } else {
                requestAnimationFrame(() => vis.selectProteinCondition(datum));
              }
            })
            .on("dblclick", (event, datum) => {
              requestAnimationFrame(() =>
                vis.clearAndSelectSingleCondition(datum)
              );
            }),
        (update) =>
          update
            .attr("cy", (d, i) => vis.margin.top + i * vis.margin.point)
            .style("fill", (d) => vis.conditionColors[d])
            .style("opacity", (d) =>
              vis.config.chartConditions.includes(d) ? "1" : "0.2"
            ),
        (exit) => exit.remove()
      );

    // Add one dot in the legend for each name.
    vis.legend
      .selectAll(".condition-label")
      .data(vis.allConditions, (d) => d)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "condition-label")
            .attr("x", vis.margin.left * 2)
            .attr("y", (d, i) => vis.margin.top + i * vis.margin.point)
            .text((d) => `${d}`)
            .style("fill", (d) => vis.conditionColors[d])
            .style("opacity", (d) =>
              vis.config.chartConditions.includes(d) ? "1" : "0.2"
            )
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
            .attr("dominant-baseline", "middle")
            .style("user-select", "none")
            .on("click", (event, datum) => {
              if (event.altKey && vis.config.chartConditions.includes(datum)) {
                requestAnimationFrame(() => vis.deselectChartConditions(datum));
              } else if (
                event.altKey &&
                !vis.config.chartConditions.includes(datum)
              ) {
                requestAnimationFrame(() => vis.selectChartConditions(datum));
              } else {
                requestAnimationFrame(() => vis.selectProteinCondition(datum));
              }
            })
            .on("dblclick", (event, datum) => {
              requestAnimationFrame(() =>
                vis.clearAndSelectSingleCondition(datum)
              );
            }),
        (update) =>
          update
            .attr("y", (d, i) => vis.margin.top + i * vis.margin.point)
            .text((d) => `${d}`)
            .style("fill", (d) => vis.conditionColors[d])
            .style("opacity", (d) =>
              vis.config.chartConditions.includes(d) ? "1" : "0.2"
            ),
        (exit) => exit.remove()
      );
  }
  selectProteinCondition(datum) {
    let vis = this;

    // If the selected condition isn't in the chart selection, don't do anything
    if (!vis.config.chartConditions.includes(datum)) {
      return;
    }

    // First, hide all other boxes
    vis.legend.selectAll(".condition-box").style("opacity", "0");

    // Select the box with the same condition as the clicked box
    vis.legend
      .selectAll(".condition-box")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", ".25");
    // Update the selected condition
    vis.config.proteinCondition = datum;

    // Dispatch an event to notify about the selected condition
    requestAnimationFrame(() => {
      const proteinConditionEvent = new CustomEvent(
        "proteinConditionSelected",
        {
          detail: vis.config.proteinCondition,
        }
      );
      window.dispatchEvent(proteinConditionEvent);
    });
  }
  selectChartConditions(datum) {
    let vis = this;

    // Color the text labels back in
    vis.legend
      .selectAll(".condition-label")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", "1");

    // Color the points back in
    vis.legend
      .selectAll(".condition-circle")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", "1");

    // Add this condition to the selected conditions
    vis.config.chartConditions.push(datum);

    // Dispatch an event to notify about the plot conditions
    requestAnimationFrame(() => {
      const chartConditionEvent = new CustomEvent("chartConditionsSelected", {
        detail: vis.config.chartConditions,
      });
      window.dispatchEvent(chartConditionEvent);
    });
  }
  deselectChartConditions(datum) {
    let vis = this;

    // If this is the last condition, don't deselect it
    if (vis.config.chartConditions.length == 1) {
      return;
    }

    // Remove this condition from the selected conditions
    vis.config.chartConditions = vis.config.chartConditions.filter(function (
      d
    ) {
      return d != datum;
    });

    // If this condition is highlighted, remove the highlight and move it to the next condition in the list
    if (vis.config.proteinCondition == datum) {
      vis.selectProteinCondition(vis.config.chartConditions[0]);
    }

    // Add opacity to the text labels and points
    vis.legend
      .selectAll(".condition-label")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", ".25");

    vis.legend
      .selectAll(".condition-circle")
      .filter(function (d) {
        return d == datum;
      })
      .style("opacity", ".25");

    // Dispatch an event to notify about the plot conditions
    requestAnimationFrame(() => {
      const chartConditionEvent = new CustomEvent("chartConditionsSelected", {
        detail: vis.config.chartConditions,
      });
      window.dispatchEvent(chartConditionEvent);
    });
  }
  clearAndSelectSingleCondition(datum) {
    let vis = this;

    // Clear all chartConditions and only keep the clicked datum
    vis.config.chartConditions = [datum];

    // Update protein condition to the selected datum
    vis.config.proteinCondition = datum;

    // Reset styles to reflect only the selected condition
    vis.legend
      .selectAll(".condition-box")
      .style("opacity", (d) => (d === datum ? ".25" : "0"));

    vis.legend
      .selectAll(".condition-circle")
      .style("opacity", (d) => (d === datum ? "1" : "0.2"));

    vis.legend
      .selectAll(".condition-label")
      .style("opacity", (d) => (d === datum ? "1" : "0.2"));

    // Dispatch events to notify about the selected condition
    requestAnimationFrame(() => {
      const chartConditionEvent = new CustomEvent("chartConditionsSelected", {
        detail: vis.config.chartConditions,
      });
      window.dispatchEvent(chartConditionEvent);
    });

    requestAnimationFrame(() => {
      const proteinConditionEvent = new CustomEvent(
        "proteinConditionSelected",
        {
          detail: vis.config.proteinCondition,
        }
      );
      window.dispatchEvent(proteinConditionEvent);
    });
  }
}
