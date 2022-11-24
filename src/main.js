import "../style.css";
import * as d3 from "d3";
import polyclonal from "../data/polyclonal.json";
import { Chart } from "./chart.js";

// INITIALIZE THE DATA //

// Format the JSON for each antibody model
for (const selection in polyclonal) {
  // Get the map for reference sites to sequential sites
  const siteMap = polyclonal[selection].sitemap;
  // Add the epitopes information
  polyclonal[selection].epitopes = ["1"];
  polyclonal[selection].epitope_colors = { 1: "#0072B2" };
  polyclonal[selection].mut_escape_df = polyclonal[selection].mut_escape_df.map(
    (e) => {
      return {
        ...e,
        site: siteMap[e.site],
        site_reference: e.site,
        escape: e.escape_mean,
      };
    }
  );
}

// INITIALIZE DEFAULTS //

const models = Object.keys(polyclonal);
let model = models[0];
let epitope = polyclonal[model].epitopes[0];
let metric = "sum";
let floor = true;
let selectedSites = [];

// DEFINE FUNCTIONS //

// Function to update html selection with options
function updateSelection(selection, options) {
  selection.innerHTML = options
    .map((option) => `<option value="${option}">${option}</option>`)
    .join("");
}

// Function to make the plot
function makePlot() {
  // 1. Set the dimensions and margins of the plot:

  // Relative scaling of the plot
  const marginScale = {
    top: 0.025,
    left: 0.04,
    bottom: 0.1,
    right: 0.06,
    innerTop: 0.05,
    innerRight: 0.08,
    focusContextRatio: 0.15,
    focusHeatmapRatio: 0.03,
  };

  // Outer dimensions of the plot
  const dimensions = {
    width: document.getElementById("chart").offsetWidth,
    height: 400,
  };

  // Margins around the outside of the plot
  dimensions.margin = {
    top: dimensions.height * marginScale.top,
    left: dimensions.width * marginScale.left,
    bottom: dimensions.height * marginScale.bottom,
    right: dimensions.width * marginScale.right,
  };
  // Margins around the inside of the plot elements
  dimensions.marginInner = {
    top: dimensions.height * marginScale.innerTop,
    right: dimensions.height * marginScale.innerRight,
  };
  // Bounded plot dimensions of each element
  dimensions.boundedContext = {
    height:
      (dimensions.height -
        dimensions.margin.top -
        dimensions.margin.bottom -
        dimensions.marginInner.top) *
      marginScale.focusContextRatio,
    width:
      (dimensions.width -
        dimensions.margin.right -
        dimensions.margin.left -
        dimensions.marginInner.right) *
      (1 - marginScale.focusHeatmapRatio),
  };
  dimensions.boundedFocus = {
    height:
      (dimensions.height -
        dimensions.margin.top -
        dimensions.margin.bottom -
        dimensions.marginInner.top) *
      (1 - marginScale.focusContextRatio),
    width:
      (dimensions.width -
        dimensions.margin.right -
        dimensions.margin.left -
        dimensions.marginInner.right) *
      (1 - marginScale.focusHeatmapRatio),
  };
  dimensions.boundedHeatmap = {
    height:
      dimensions.height - dimensions.margin.top - dimensions.margin.bottom,
    width:
      (dimensions.width -
        dimensions.margin.right -
        dimensions.margin.left -
        dimensions.marginInner.right) *
      marginScale.focusHeatmapRatio,
  };

  // 2. Access, summarize, and filter the data:

  // Get the escape data for the selected model and epitope
  const data = polyclonal[model].mut_escape_df;
  const escapeDataSummary = summarizeEscapeData(data).filter(
    (e) => e.epitope === epitope
  );

  // Subset the data for the heatmap and pick initial site
  let initSiteSelection = escapeDataSummary.filter(
    (d) => d[metric] === d3.max(escapeDataSummary, (d) => d[metric])
  )[0].site;
  let heatmapEscapeData = data.filter(
    (e) => e.site === initSiteSelection && e.epitope === epitope
  );

  // Get the positive and negative colors for the epitope
  const positiveColor = polyclonal[model].epitope_colors[epitope];
  const negativeColor = invertColor(positiveColor);

  // Get the amino acid alphabet for the model
  const alphabet = polyclonal[model].alphabet;

  // Define functions to access data for each encoding
  const xAccessorContext = (d) => d.site;
  const yAccessorContext = (d) => {
    return floor && d[metric] < 0 ? 0 : d[metric];
  };

  const xAccessorFocus = (d) => d.site;
  const yAccessorFocus = (d) => {
    return floor && d[metric] < 0 ? 0 : d[metric];
  };

  const xAccessorHeatmap = (d) => d.site;
  const yAccessorHeatmap = (d) => d.mutant;
  const colorAccessorHeatmap = (d) => {
    return floor && d.escape < 0 ? 0 : d.escape;
  };

  // 3. Draw the canvas:

  // Chart wrapper
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)
    .property("value", selectedSites)
    .attr("class", "wrapper");

  // Define chart bounds
  const bounds = svg
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  // 4. Create the scales:

  // Scales for the Context plot
  const xScaleContext = d3
    .scaleLinear()
    .domain(d3.extent(escapeDataSummary, xAccessorContext))
    .range([0, dimensions.boundedContext.width])
    .nice();

  const yScaleContext = d3
    .scaleLinear()
    .domain(d3.extent(escapeDataSummary, yAccessorContext))
    .range([dimensions.boundedContext.height, 0]);

  // Scales for the Focus plot
  const xScaleFocus = d3
    .scaleLinear()
    .domain(d3.extent(escapeDataSummary, xAccessorFocus))
    .range([0, dimensions.boundedFocus.width])
    .nice();

  const yScaleFocus = d3
    .scaleLinear()
    .domain(d3.extent(escapeDataSummary, yAccessorFocus))
    .range([dimensions.boundedFocus.height, 0])
    .nice();

  // Scales for the Heatmap plot
  const xScaleHeatmap = d3
    .scaleBand()
    .domain([d3.max(heatmapEscapeData, xAccessorHeatmap)]) // <-- *TEMP*
    .range([0, dimensions.boundedHeatmap.width])
    .padding(0.1);

  const yScaleHeatmap = d3
    .scaleBand()
    .domain(alphabet)
    .range([0, dimensions.boundedHeatmap.height]) // <-- This reverses the scale order, possibly buggy?
    .padding(0.1);

  // The color scale depends on whether escape is floored
  let colorScaleHeatmap;
  if (!floor) {
    colorScaleHeatmap = d3
      .scaleLinear()
      .domain([
        -d3.max(d3.extent(data, colorAccessorHeatmap).map(Math.abs)),
        0,
        d3.max(d3.extent(data, colorAccessorHeatmap).map(Math.abs)),
      ])
      .range([negativeColor, "white", positiveColor]);
  } else {
    colorScaleHeatmap = d3
      .scaleLinear()
      .domain([0, d3.max(data, colorAccessorHeatmap)])
      .range(["white", positiveColor]);
  }

  // 5. Draw the data:

  // ------ CONTEXT PLOT ------ //

  // Construct an area generator
  const contextAreaGenerator = d3
    .area()
    .curve(d3.curveLinear)
    .x((d) => xScaleContext(xAccessorContext(d)))
    .y0(yScaleContext(0))
    .y1((d) => yScaleContext(yAccessorContext(d)));

  // Make a group to hold the context plot
  const contextPlot = bounds.append("g").attr("class", "context-plot");

  // Add the area to the context plot
  contextPlot
    .append("path")
    .attr("fill", positiveColor)
    .attr("d", contextAreaGenerator(escapeDataSummary));

  // ------ FOCUS PLOT ------ //

  // Construct a line generator.
  const focusLineGenerator = d3
    .line()
    .curve(d3.curveLinear)
    .x((d) => xScaleFocus(xAccessorFocus(d)))
    .y((d) => yScaleFocus(yAccessorFocus(d)));

  // Make a group to hold the focus plot
  const focusPlot = bounds
    .append("g")
    .style(
      "transform",
      `translateY(${
        dimensions.marginInner.top + dimensions.boundedContext.height
      }px)`
    )
    .attr("class", "focus-plot")
    .on("dblclick", deselectSites); // Clear the selection

  const focusBrush = d3
    .brush()
    .extent([
      [0, 0],
      [dimensions.boundedFocus.width, dimensions.boundedFocus.height + 5], // There needs to be y-padding if you floor the values
    ])
    .on("end", brushedFocus)
    .keyModifiers(false);

  focusPlot.append("g").attr("class", "focusBrush").call(focusBrush);

  // Create a mask for points outside of plot
  focusPlot
    .append("clipPath")
    .attr("id", "focusClipPath")
    .append("rect")
    .attr("width", dimensions.boundedFocus.width)
    .attr("height", dimensions.boundedFocus.height);

  // Draw the line plot
  const focusLine = focusPlot
    .append("g")
    .attr("class", "focus-line")
    .append("path")
    .attr("class", "line")
    .attr("clip-path", "url(#focusClipPath)") // <-- *TEMP* adding a clip path, better to refactor as a group element
    .attr("fill", "none")
    .attr("stroke", positiveColor)
    .attr("stroke-width", 1.5)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("stroke-opacity", 1)
    .attr("d", focusLineGenerator(escapeDataSummary));

  // Draw the points
  const focusPoints = focusPlot
    .append("g")
    .attr("fill", "white")
    .attr("stroke", positiveColor)
    .attr("stroke-width", 2)
    .selectAll("circle")
    .data(escapeDataSummary)
    .join("circle")
    .attr("clip-path", "url(#focusClipPath)") // <-- *TEMP* adding a clip path, better to refactor as a group element
    .attr("cx", (d) => xScaleFocus(xAccessorFocus(d)))
    .attr("cy", (d) => yScaleFocus(yAccessorFocus(d)))
    .attr("r", 5)
    .on("click", updateHeatmap);

  // Add the tooltip call
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("opacity", 0);

  focusPoints
    .on("mouseover", (evt, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `Site: ${d.site}<br>Escape ${metric}: ${d[metric].toFixed(
            4
          )}<br>Wildtype: ${d.wildtype}`
        )
        .style("border-color", positiveColor);
    })
    .on("mousemove", (evt, d) => {
      tooltip
        .style("top", evt.pageY - 10 + "px")
        .style("left", evt.pageX + 10 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  focusPoints
    .filter((d) => d.site === initSiteSelection)
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  // ------ HEATMAP PLOT ------ //

  // Make a group to hold the heatmap plot
  const heatmapPlot = bounds
    .append("g")
    .style(
      "transform",
      `translateX(${
        dimensions.marginInner.right + dimensions.boundedContext.width
      }px)`
    )
    .attr("class", "heatmap-plot");

  // Make a rect for the background missing mutants
  const missingRect = heatmapPlot
    .append("rect")
    .attr("width", dimensions.boundedHeatmap.width)
    .attr("height", dimensions.boundedHeatmap.height)
    .style("fill", "none")
    .style("stroke", "black");

  // Make rects for each mutant at a site
  const mutantRects = heatmapPlot
    .append("g")
    .attr("class", "mutant")
    .selectAll("rect")
    .data(heatmapEscapeData)
    .join("rect")
    .attr("x", (d) => xScaleHeatmap(xAccessorHeatmap(d)))
    .attr("y", (d) => yScaleHeatmap(yAccessorHeatmap(d)))
    .attr("width", xScaleHeatmap.bandwidth())
    .attr("height", yScaleHeatmap.bandwidth())
    .style("fill", (d) => colorScaleHeatmap(colorAccessorHeatmap(d)))
    .style("stroke", "black")
    .on("mouseover", (evt, d) => {
      tooltip
        .style("opacity", 1)
        .html(`Escape: ${d.escape.toFixed(4)}`)
        .style("border-color", positiveColor)
        .style("font-size", "1em");
    })
    .on("mousemove", (evt, d) => {
      tooltip
        .style("top", evt.pageY - 10 + "px")
        .style("left", evt.pageX + 10 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // Make mark for wildtype amino acid
  const wildtypeMark = heatmapPlot
    .selectAll("text")
    .data(heatmapEscapeData)
    .join("text")
    .attr("class", "wildtype")
    .attr(
      "transform",
      `translate(${xScaleHeatmap.bandwidth() / 2}, ${
        yScaleHeatmap.bandwidth() / 2
      })`
    )
    .attr("x", (d) => xScaleHeatmap(xAccessorHeatmap(d)))
    .attr("y", (d) => yScaleHeatmap(d.wildtype))
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-family", "Arial")
    .text("x");

  /* 5. Draw the peripherals */

  // ------ CONTEXT AXES ------ //

  // Context Axis Generators
  const xAxisContext = d3.axisBottom(xScaleContext).tickSizeOuter(0);
  const yAxisContext = d3.axisLeft(yScaleContext).ticks(2).tickSizeOuter(0);

  // x-Axis Context
  contextPlot
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${dimensions.boundedContext.height})`)
    .call(xAxisContext)
    .call((g) => g.select(".domain").style("stroke-width", ".5"))
    .call((g) => g.selectAll(".tick").remove());

  // y-Axis Context
  contextPlot.append("g").attr("class", "y axis").call(yAxisContext);

  // ------ FOCUS AXES ------ //

  // Focus Axis Generators
  const xAxisFocus = d3.axisBottom(xScaleFocus);
  const yAxisFocus = d3.axisLeft(yScaleFocus);

  // x-Axis Focus
  focusPlot
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${dimensions.boundedFocus.height})`)
    .call(xAxisFocus)
    .append("text")
    .attr("class", "axis-label")
    .text("Site")
    .attr("x", dimensions.boundedFocus.width / 2)
    .attr("y", 30)
    .attr("fill", "black")
    .attr("font-size", "16px")
    .attr("text-anchor", "middle");

  // y-Axis Focus
  focusPlot
    .append("g")
    .attr("class", "y axis")
    .call(yAxisFocus)
    .append("text")
    .attr("class", "axis-label")
    .text(`${metric.charAt(0).toUpperCase() + metric.slice(1)} of Escape`)
    .attr("transform", "rotate(-90)")
    .attr("x", -(dimensions.boundedFocus.height / 2))
    .attr("y", -30)
    .attr("fill", "black")
    .attr("font-size", "16px")
    .attr("text-anchor", "middle");

  // ------ HEATMAP AXES ------ //

  // Heatmap Axis Generators
  const xAxisHeatmap = d3.axisBottom(xScaleHeatmap).tickSizeOuter(0);
  const yAxisHeatmap = d3.axisLeft(yScaleHeatmap).tickSizeOuter(0);

  // x-Axis Heatmap
  heatmapPlot
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${dimensions.boundedHeatmap.height})`)
    .call(xAxisHeatmap);

  // y-Axis Heatmap
  heatmapPlot.append("g").attr("class", "y axis").call(yAxisHeatmap);

  // ------ HEATMAP LEGEND ------ //

  const heatmapLegendMargin = 10;

  // Make a group to hold the legend components
  const heatmapLegend = heatmapPlot
    .append("g")
    .attr("class", "heatmapLegend")
    .attr(
      "transform",
      `translate(${dimensions.boundedHeatmap.width + heatmapLegendMargin})`
    );

  // Append a linearGradient element to the defs and give it a unique id
  const linearGradient = heatmapLegend
    .append("defs")
    .append("linearGradient")
    .attr("id", "linear-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%")
    .selectAll("stop")
    .data(colorScaleHeatmap.range())
    .join("stop")
    .attr("offset", (d, i) => i / (colorScaleHeatmap.range().length - 1))
    .attr("stop-color", (d) => d);

  // Append the rect and add the gradient
  heatmapLegend
    .append("rect")
    .attr("width", `${dimensions.boundedHeatmap.width / 2}px`)
    .attr("height", `${dimensions.boundedHeatmap.height / 2}px`)
    .style("fill", `url(#linear-gradient)`);

  // Generate the legend axis elements
  const legendScale = colorScaleHeatmap
    .copy()
    .rangeRound(
      d3.quantize(
        d3.interpolate(dimensions.boundedHeatmap.height / 2, 0),
        colorScaleHeatmap.range().length
      )
    );

  // Draw the peripherals
  heatmapLegend
    .append("g")
    .attr("transform", `translate(${dimensions.boundedHeatmap.width / 2})`)
    .call(d3.axisRight(legendScale).ticks(6).tickSize(0))
    .call((g) => g.select(".domain").remove());

  // -------------------------------------------- CONTEXT BRUSHING -------------------------------------------- //

  // Make the brush element
  const brush = d3
    .brushX()
    .extent([
      [0, 0],
      [dimensions.boundedContext.width, dimensions.boundedContext.height],
    ])
    .on("brush end", brushed);

  // Make the zoom element
  const zoom = d3
    .zoom()
    .scaleExtent([1, Infinity])
    .translateExtent(
      [0, 0],
      [dimensions.boundedFocus.width, dimensions.boundedFocus.height]
    )
    .extent(
      [0, 0],
      [dimensions.boundedFocus.width, dimensions.boundedFocus.height]
    )
    .on("zoom", zoomed);

  // Define the function for brush behaviour
  function brushed(event) {
    // Ignore brush-by-zoom events
    if (event.sourceEvent && event.sourceEvent.type == "zoom") return;

    // The extent of the brush is either the selection, or the whole range.
    let extent = event.selection || xScaleContext.range();

    // Update the domain of the focus scale based on the current selection
    xScaleFocus.domain(extent.map(xScaleContext.invert, xScaleContext));

    // Update the drawn data based on the new focus scale
    focusPlot
      .selectAll(".line")
      .attr("d", focusLineGenerator(escapeDataSummary));
    focusPlot
      .selectAll("circle")
      .attr("cx", (d) => xScaleFocus(xAccessorFocus(d)));

    // Update the x axis of the focus plot based on selection
    focusPlot.selectAll(".x.axis").call(xAxisFocus);

    // Do something with 'zoom'?
    svg
      .selectAll(".zoom")
      .call(
        zoom.transform,
        d3.zoomIdentity
          .scale(dimensions.boundedFocus.width / (extent[1] - extent[0]))
          .translate(-extent[0], 0)
      );
  }

  // Define the function for zoom behaviour
  function zoomed(event) {
    // Ignore zoom-by-brush events
    if (event.sourceEvent && event.sourceEvent.type === "brush") return;

    let transform = event.transform;

    xScaleFocus.domain(transform.rescaleX(xScaleContext).domain());

    // Update the drawn data based on the new focus scale
    focusPlot
      .selectAll(".line")
      .attr("d", focusLineGenerator(escapeDataSummary));
    focusPlot
      .selectAll("circle")
      .attr("cx", (d) => xScaleFocus(xAccessorFocus(d)));

    // Update the x axis of the focus plot based on selection
    focusPlot.selectAll(".x.axis").call(xAxisFocus);

    svg
      .append("g")
      .selectAll(".brush")
      .call(brush.move, xScaleFocus.range().map(transform.invertX, transform));
  }

  contextPlot
    .append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, null);

  // -------------------------------------------- CONTEXT BRUSHING -------------------------------------------- //

  // ------------------------------------------- HEATMAP SELECTION -------------------------------------------- //

  function updateHeatmap() {
    focusPoints.attr("stroke", positiveColor).attr("stroke-width", 2);

    // Get the site from the object being clicked on
    let site = d3.select(this).datum().site;

    // Update the scale based on the site
    xScaleHeatmap.domain([site]);

    // Update the data
    heatmapEscapeData = data.filter(
      (e) => e.site === site && e.epitope === epitope
    );

    // Re-draw the x-axis based on the updated scale
    heatmapPlot.selectAll(".x.axis").call(xAxisHeatmap);

    // Re-draw the mutant data elements
    heatmapPlot.selectAll(".mutant rect").remove();
    heatmapPlot
      .select(".mutant")
      .selectAll("rect")
      .data(heatmapEscapeData)
      .join("rect")
      .attr("x", (d) => xScaleHeatmap(xAccessorHeatmap(d)))
      .attr("y", (d) => yScaleHeatmap(yAccessorHeatmap(d)))
      .attr("width", xScaleHeatmap.bandwidth())
      .attr("height", yScaleHeatmap.bandwidth())
      .style("fill", (d) => colorScaleHeatmap(colorAccessorHeatmap(d)))
      .style("stroke", "black")
      .on("mouseover", (evt, d) => {
        tooltip
          .style("opacity", 1)
          .html(`Escape: ${d.escape.toFixed(4)}`)
          .style("border-color", positiveColor)
          .style("font-size", "1em");
      })
      .on("mousemove", (evt, d) => {
        tooltip
          .style("top", evt.pageY - 10 + "px")
          .style("left", evt.pageX + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Re-draw the wildtype data elements
    heatmapPlot.selectAll(".wildtype").remove();
    heatmapPlot
      .selectAll(".wildtype")
      .data(heatmapEscapeData)
      .join("text")
      .attr("class", "wildtype")
      .attr(
        "transform",
        `translate(${xScaleHeatmap.bandwidth() / 2}, ${
          yScaleHeatmap.bandwidth() / 2
        })`
      )
      .attr("x", (d) => xScaleHeatmap(xAccessorHeatmap(d)))
      .attr("y", (d) => yScaleHeatmap(d.wildtype))
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .text("x");

    d3.select(this).attr("stroke", "black").attr("stroke-width", 2.5);
  }

  // ------------------------------------------- HEATMAP SELECTION -------------------------------------------- //

  // --------------------------------------------- FOCUS BRUSHING --------------------------------------------- //

  function brushedFocus({ selection }) {
    if (selection) {
      let value;
      // Destructure the selection bounds
      const [[x0, y0], [x1, y1]] = selection;

      // Save the `value` as the data attached to each node
      value = focusPoints
        .filter(
          (d) =>
            x0 <= xScaleFocus(xAccessorFocus(d)) &&
            xScaleFocus(xAccessorFocus(d)) < x1 &&
            y0 <= yScaleFocus(yAccessorFocus(d)) &&
            yScaleFocus(yAccessorFocus(d)) < y1
        )
        .data();

      //  Update the selected sites
      value.forEach((v) => {
        selectedSites.push(v.site);
        focusPoints
          .filter((d) => d.site === v.site)
          .attr("fill", positiveColor);
      });

      // Clear the brush
      focusPlot.select(".focusBrush").call(focusBrush.move, null);
    }

    // Update the svg with the selected sites
    svg.property("value", Array.from(new Set(selectedSites))).dispatch("input");
  }

  function deselectSites() {
    selectedSites.forEach((site) => {
      focusPoints.filter((d) => d.site === site).attr("fill", "white");
    });
    selectedSites.length = 0;
    // Update the svg with the selected sites
    svg.property("value", Array.from(new Set(selectedSites))).dispatch("input");
  }

  // --------------------------------------------- FOCUS BRUSHING --------------------------------------------- //
}

// DOM SELECTIONS AND MANIPULATIONS //

// For each selection element, update with options
const modelSelection = document.getElementById("model");
updateSelection(modelSelection, models);
const epitopeSelection = document.getElementById("epitope");
updateSelection(epitopeSelection, polyclonal[models[0]].epitopes);
const metricSelection = document.getElementById("metric");
updateSelection(metricSelection, ["sum", "mean", "min", "max"]);

// Add event listener to update model
modelSelection.addEventListener("change", (event) => {
  model = event.target.value;
  const epitopes = polyclonal[model].epitopes;
  updateSelection(epitopeSelection, epitopes);
  epitopeSelection.dispatchEvent(new Event("change"));
  // updatePlot();
});

// Add event listener to update epitope
epitopeSelection.addEventListener("change", (event) => {
  epitope = event.target.value;
  // updatePlot();
});

// Add event listener to update summary metric
metricSelection.addEventListener("change", (event) => {
  metric = event.target.value;
  // updatePlot();
});

// Add event listener to update floor
document.getElementById("floor").addEventListener("change", (event) => {
  floor = event.target.checked;
  // updatePlot();
});

// INITIALIZE THE PLOT //
let chart = new Chart(
  {
    model: model,
    epitope: epitope,
    metric: metric,
    floor: floor,
    parentElement: "#chart",
  },
  polyclonal
);
