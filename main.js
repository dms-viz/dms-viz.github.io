import "./style.css";
import * as d3 from "d3";
import * as NGL from "ngl";
import polyclonal from "./data/polyclonal.json";

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

// Function to summarize escape data
function summarizeEscapeData(data) {
  // Calculate summary stats for each site/epitope pair
  const escapeDataRollup = d3.rollup(
    data,
    (v) => {
      return {
        mean: d3.mean(v, (d) => d.escape),
        sum: d3.sum(v, (d) => d.escape),
        min: d3.min(v, (d) => d.escape),
        max: d3.max(v, (d) => d.escape),
      };
    },
    (d) => d.site,
    (d) => d.epitope
  );

  // Join the map of summarized escape back to the original
  const escapeDataSummary = data
    .map((e) => {
      return {
        epitope: e.epitope,
        site: e.site,
        wildtype: e.wildtype,
        ...escapeDataRollup.get(e.site).get(e.epitope),
      };
    })
    .filter(
      (element, index, self) =>
        index ===
        self.findIndex(
          (e) => e.site === element.site && e.epitope === element.epitope
        )
    );

  return escapeDataSummary;
}

// Function to find the complement of a hex color
function invertColor(hexColor) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const complement =
    "#" + ((0xffffff ^ ((r << 16) | (g << 8) | b)) >>> 0).toString(16);
  return complement;
}

// Function to update the plot when something is changed
function updatePlot() {
  d3.select("#chart").selectAll("svg").remove();
  selectedSites = [];
  makePlot();
}

// Function to make NGL stage
function makeStage(viewportID, backgroundColor = "white") {
  /*
  This function returns an NGL stage referening a specific DOM container.
  Custom tooltip parameters are are currently assigned in this function.
  
  Parameters
  ----------
  viewport: string 
    The name of an html div to use as a container to display the structure
  backgroundColor: string
    Color to use as the background
  Returns
  -------
  NGL.stage
    An NGL Stage object
  */

  // Define the HTML element for the tooltip:
  let tooltip = document.createElement("div");
  document.body.appendChild(tooltip);
  // CSS style of the tooltip
  Object.assign(tooltip.style, {
    display: "none",
    position: "absolute",
    zIndex: 10,
    pointerEvents: "none",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "lightgrey",
    padding: "0.5em",
    fontFamily: "sans-serif",
  });

  // Define the stage
  let stage = new NGL.Stage(viewportID, { backgroundColor: backgroundColor });
  // Add the custom tooltip to the stage
  stage.mouseControls.remove("hoverPick");
  stage.signals.hovered.add(function (pickingProxy) {
    if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
      var atom = pickingProxy.atom || pickingProxy.closestBondAtom;
      var mp = pickingProxy.mouse.position;
      let residue = atom.residue;
      // Define the tooltip display here //
      tooltip.innerText =
        residue.resno +
        " - Sequential #\n" +
        residue.resname +
        " - Residue\n" +
        residue.chainname +
        " - Chain\n";
      // Define the tooltip display here //
      tooltip.style.bottom = window.innerHeight - mp.y + 3 + "px";
      tooltip.style.left = mp.x + 3 + "px";
      tooltip.style.display = "block";
    } else {
      tooltip.style.display = "none";
    }
  });

  return stage;
}

// Function to load in structure component
async function loadStructure(stage, pdbID, schemeId, fill, opacity) {
  /*
  This function loads a strucutre into a stage via side-effects.
  
  Parameters
  ----------
  stage: NGL.Stage 
    An instance of a NGL.Stage 
  pdbID: string
    A valid PDB id
  schemeId: string
    Either a valid color for NGL or the schemeId string to use
  Returns
  -------
  undefined
  */
  const pdbURL = `rcsb://${pdbID}`;
  let structure;
  stage.removeAllComponents();
  await stage.loadFile(pdbURL).then((d) => {
    d.addRepresentation(fill, {
      color: schemeId,
      opacity: opacity,
      smoothSheet: true,
      roughness: 1,
    });
    d.setRotation([2, 0, 0]);
    stage.autoView();
    stage.setSpin(false);
    structure = d;
  });

  return structure;
}

function makeSiteString(site, chain) {
  return `${chain != "polymer" ? ":" : ""}${chain} and ${site}`;
}

function makeColorScheme(
  data,
  metric,
  epitope,
  positiveColor,
  negativeColor,
  chains,
  altColor = 0xe0e5e7,
  floor = true
) {
  /*
This function creates a class with a atomColor method that returns a hex color.
It adds this class to the NGL color register. 

TODO: change how the color integers get parsed.

Parameters
----------
chains: array 
An array containing the names of the chains to color
altColor: number
Hexidecimal number representing a color
Returns
-------
string
Either a valid color for NGL or the schemeId string to use

*/

  // Summarize amino-acid escape data
  const escapeDataSummary = summarizeEscapeData(data).filter(
    (e) => e.epitope === epitope
  );
  // Get the min and max of the summary statistic
  const metricExtent = d3.extent(escapeDataSummary.map((d) => d[metric]));

  // Define the functions for the color scale
  let scaleFunc;
  if (!floor) {
    scaleFunc = d3
      .scaleDiverging()
      .domain([-metricExtent[1], 0, metricExtent[1]])
      .range([negativeColor, "white", positiveColor]);
  } else {
    scaleFunc = d3
      .scaleLinear()
      .domain([0, metricExtent[1]])
      .range(["white", positiveColor]);
  }
  // Use the scale function to map data to a color
  const colorMap = new Map(
    escapeDataSummary.map((d) => {
      return [d.site, scaleFunc(d[metric])];
    })
  );

  // Define a schemeId with the color registry for this data combination
  const schemeId = NGL.ColormakerRegistry.addScheme(function (params) {
    this.atomColor = (atom) => {
      if (chains.includes(atom.chainname) && colorMap.has(atom.residue.resno)) {
        // Color by array of escape summary - must be hexbase integer
        return parseInt(
          d3.color(colorMap.get(atom.residue.resno)).formatHex().slice(1),
          16
        );
      } else {
        // light grey by default
        return altColor;
      }
    };
  });

  return schemeId;
}

function getChains() {
  // Empty array to hold the chain names
  let options = [["All Chains", "polymer"]];

  // Get all the chain names that are part of the polymer selection
  component.structure.eachChain(function (cp) {
    let name = cp.chainname;
    if (cp.entity.description) name += " (" + cp.entity.description + ")";
    options.push([name, cp.chainname]);
  }, new NGL.Selection("polymer"));
  return new Map(options);
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
  updatePlot();
});

// Add event listener to update epitope
epitopeSelection.addEventListener("change", (event) => {
  epitope = event.target.value;
  updatePlot();
});

// Add event listener to update summary metric
metricSelection.addEventListener("change", (event) => {
  metric = event.target.value;
  updatePlot();
});

// Add event listener to update floor
document.getElementById("floor").addEventListener("change", (event) => {
  floor = event.target.checked;
  updatePlot();
});

// INITIALIZE THE PLOT //
makePlot();

// INITIALIZE THE PROTEIN //
let stage = makeStage("viewport");
let component = await loadStructure(stage, "7QO7", "#d4d4d4", "ribbon", 0.5);
let chains = getChains();
let schemeID = makeColorScheme(
  polyclonal[model].mut_escape_df,
  metric,
  epitope,
  polyclonal[model].epitope_colors[epitope],
  invertColor(polyclonal[model].epitope_colors[epitope]),
  [...chains.values()],
  0xe0e5e7,
  floor
);

// Update the protein with the selected sites
let svg = d3.select("#chart .wrapper");
svg.on("input", () => {
  const sites = svg.property("value");
  const currentSelection = sites.length
    ? sites.map((site) => makeSiteString(site, "polymer") + " or ").join("")
    : undefined;
  console.log(currentSelection);
  if (currentSelection !== undefined) {
    stage.getRepresentationsByName("currentSelection").dispose();
    return component
      .addRepresentation("spacefill", {
        color: schemeID,
        roughness: 1,
        surfaceType: "av",
        name: "currentSelection",
      })
      .setSelection(currentSelection);
  } else {
    stage.getRepresentationsByName("currentSelection").dispose();
  }
});

// resize the plot when the window is resized
window.addEventListener("resize", () => {
  updatePlot();
});
