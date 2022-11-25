/* Making a class to hold the chart code inspried by https://github.com/UBC-InfoVis/436V-materials/tree/main/case-studies/case-study_measles-and-vaccines */
import * as d3 from "d3";
import { summarizeEscapeData, invertColor } from "./utils.js";

export class Chart {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Object}
   */
  constructor(_config, _data) {
    this.config = _config;
    this.config = {
      model: _config.model,
      epitope: _config.epitope,
      metric: _config.metric,
      floor: _config.floor,
      parentElement: _config.parentElement,
      width: 1080,
      height: 420,
      scaling: {
        top: 0.025,
        left: 0.04,
        bottom: 0.1,
        right: 0.06,
        innerTop: 0.05,
        innerRight: 0.08,
        focusContextRatio: 0.15,
        focusHeatmapRatio: 0.03,
      },
    };
    this.data = _data;

    this.initVis();
  }
  /**
   * Set dimensions and margins of the visualization,
   * initialize SVG canvas,
   * and setup static elements like scales and axes.
   */
  initVis() {
    let vis = this;

    // Initialize the MARGINS around the chart
    vis.margin = {
      top: vis.config.height * vis.config.scaling.top,
      left: vis.config.width * vis.config.scaling.left,
      bottom: vis.config.height * vis.config.scaling.bottom,
      right: vis.config.width * vis.config.scaling.right,
      innerTop: vis.config.height * vis.config.scaling.innerTop,
      innerRight: vis.config.width * vis.config.scaling.innerRight,
    };

    // Initialize the DIMENSIONS of the chart
    const boundedHeight =
      vis.config.height -
      vis.margin.top -
      vis.margin.bottom -
      vis.margin.innerTop;
    const boundedWidth =
      vis.config.width -
      vis.margin.left -
      vis.margin.right -
      vis.margin.innerRight;

    vis.bounds = {
      context: {
        height: boundedHeight * vis.config.scaling.focusContextRatio,
        width: boundedWidth * (1 - vis.config.scaling.focusHeatmapRatio),
      },
      focus: {
        height: boundedHeight * (1 - vis.config.scaling.focusContextRatio),
        width: boundedWidth * (1 - vis.config.scaling.focusHeatmapRatio),
      },
      heatmap: {
        height: vis.config.height - vis.margin.top - vis.margin.bottom,
        width: boundedWidth * vis.config.scaling.focusHeatmapRatio,
      },
    };

    // Chart CANVAS
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.width)
      .attr("height", vis.config.height)
      .attr("class", "wrapper");

    // Define chart AREA
    vis.boundedArea = vis.svg
      .append("g")
      .style(
        "transform",
        `translate(${vis.margin.left}px, ${vis.margin.top}px)`
      );

    // Define the elements of the CONTEXT
    vis.contextPlot = vis.boundedArea.append("g").attr("class", "context");

    // Define the elements of the FOCUS
    vis.focusPlot = vis.boundedArea
      .append("g")
      .style(
        "transform",
        `translateY(${vis.margin.innerTop + vis.bounds.context.height}px)`
      )
      .attr("class", "focus");
    vis.focusPlot
      .append("clipPath")
      .attr("id", "focusClipPath")
      .append("rect")
      .attr("width", vis.bounds.focus.width)
      .attr("height", vis.bounds.focus.height);

    // Define the elements of the HEATMAP
    vis.heatmapPlot = vis.boundedArea
      .append("g")
      .style(
        "transform",
        `translateX(${vis.margin.innerRight + vis.bounds.context.width}px)`
      )
      .attr("class", "heatmap");
    vis.heatmapPlot
      .append("rect")
      .attr("width", vis.bounds.heatmap.width)
      .attr("height", vis.bounds.heatmap.height)
      .style("fill", "none")
      .style("stroke", "black");

    // Define the TOOLTIP
    vis.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0);

    // Initialize SCALES
    vis.xScaleContext = d3
      .scaleLinear()
      .range([0, vis.bounds.context.width])
      .nice();
    vis.yScaleContext = d3.scaleLinear().range([vis.bounds.context.height, 0]);
    vis.xScaleFocus = d3.scaleLinear().range([0, vis.bounds.focus.width]);
    vis.yScaleFocus = d3.scaleLinear().range([vis.bounds.focus.height, 0]);
    vis.xScaleHeatmap = d3
      .scaleBand()
      .range([0, vis.bounds.heatmap.width])
      .padding(0.1);
    vis.yScaleHeatmap = d3
      .scaleBand()
      .range([0, vis.bounds.heatmap.height])
      .padding(0.1);
    vis.colorScaleHeatmap = d3.scaleLinear();

    // Initialize AXES
    vis.xAxisContext = d3.axisBottom(vis.xScaleContext).tickSizeOuter(0);
    vis.xAxisContextG = vis.contextPlot
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0, ${vis.bounds.context.height})`);
    vis.yAxisContext = d3.axisLeft(vis.yScaleContext).ticks(2).tickSizeOuter(0);
    vis.yAxisContextG = vis.contextPlot
      .append("g")
      .attr("class", "axis y-axis");

    vis.xAxisFocus = d3.axisBottom(vis.xScaleFocus).tickSizeOuter(0);
    vis.xAxisFocusG = vis.focusPlot
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0, ${vis.bounds.focus.height})`);
    vis.yAxisFocus = d3.axisLeft(vis.yScaleFocus).tickSizeOuter(0);
    vis.yAxisFocusG = vis.focusPlot.append("g").attr("class", "axis y-axis");
    vis.xAxisHeatmap = d3.axisBottom(vis.xScaleHeatmap).tickSizeOuter(0);
    vis.xAxisHeatmapG = vis.heatmapPlot
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0, ${vis.bounds.heatmap.height})`);
    vis.yAxisHeatmap = d3.axisLeft(vis.yScaleHeatmap).tickSizeOuter(0);
    vis.yAxisHeatmapG = vis.heatmapPlot
      .append("g")
      .attr("class", "axis y-axis");

    // Initialize LEGEND
    vis.heatmapLegend = vis.heatmapPlot
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${vis.bounds.heatmap.width + 10})`);
    vis.legendLinearGradient = vis.heatmapLegend
      .append("defs")
      .append("linearGradient")
      .attr("id", "linear-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");
    vis.legendColorRamp = vis.heatmapLegend
      .append("rect")
      .attr("width", `${vis.bounds.heatmap.width / 2}px`)
      .attr("height", `${vis.bounds.heatmap.height / 2}px`)
      .style("fill", `url(#linear-gradient)`);

    // UPDATE
    vis.updateVis();
  }
  /**
   * Prepare the data and scales before rendering.
   */
  updateVis() {
    let vis = this;

    // PROCCESS DATA
    vis.mutEscape = vis.data[vis.config.model].mut_escape_df;
    // Summarize and filter the models based on the selections
    vis.mutEscapeSummary = summarizeEscapeData(vis.mutEscape).filter(
      (e) => e.epitope === vis.config.epitope
    );
    // Pick the site with the highest escape for the selected summary metric
    vis.initSiteSelection = vis.mutEscapeSummary.filter(
      (d) =>
        d[vis.config.metric] ===
        d3.max(vis.mutEscapeSummary, (d) => d[vis.config.metric])
    )[0].site;
    // Initialize the heatmap data for the selected site
    vis.mutEscapeHeatmap = vis.mutEscape.filter(
      (e) =>
        e.site === vis.initSiteSelection && e.epitope === vis.config.epitope
    );
    // Make the color scheme for the plots
    vis.positiveColor =
      vis.data[vis.config.model].epitope_colors[vis.config.epitope];
    vis.negativeColor = invertColor(vis.positiveColor);
    // Get the amino acid alphabet for the model
    vis.alphabet = vis.data[vis.config.model].alphabet;

    // DEFINE ACCESSORS
    vis.xAccessorContext = (d) => d.site;
    vis.yAccessorContext = (d) => {
      return vis.config.floor && d[vis.config.metric] < 0
        ? 0
        : d[vis.config.metric];
    };
    vis.xAccessorFocus = (d) => d.site;
    vis.yAccessorFocus = (d) => {
      return vis.config.floor && d[vis.config.metric] < 0
        ? 0
        : d[vis.config.metric];
    };
    vis.xAccessorHeatmap = (d) => d.site;
    vis.yAccessorHeatmap = (d) => d.mutant;
    vis.colorAccessorHeatmap = (d) => {
      return vis.config.floor && d.escape < 0 ? 0 : d.escape;
    };

    // UPDATE SCALES
    vis.xScaleContext.domain(
      d3.extent(vis.mutEscapeSummary, vis.xAccessorContext)
    );
    vis.yScaleContext.domain(
      d3.extent(vis.mutEscapeSummary, vis.yAccessorContext)
    );
    // Adjust the domain to add some padding to each scale
    let xExtentFocus = d3.extent(vis.mutEscapeSummary, vis.xAccessorFocus);
    let xRangeFocus = xExtentFocus[1] - xExtentFocus[0];
    let yExtentFocus = d3.extent(vis.mutEscapeSummary, vis.yAccessorFocus);
    let yRangeFocus = yExtentFocus[1] - yExtentFocus[0];
    vis.xScaleFocus.domain([
      xExtentFocus[0],
      xExtentFocus[1] + xRangeFocus * 0.05,
    ]);
    vis.yScaleFocus.domain([
      yExtentFocus[0],
      yExtentFocus[1] + yRangeFocus * 0.05,
    ]);
    vis.xScaleHeatmap.domain([
      d3.max(vis.mutEscapeHeatmap, vis.xAccessorHeatmap),
    ]);
    vis.yScaleHeatmap.domain(vis.alphabet);
    // Color is dynamic depending on whether the data is floored
    if (!vis.config.floor) {
      vis.colorScaleHeatmap
        .domain([
          -d3.max(
            d3.extent(vis.mutEscape, vis.colorAccessorHeatmap).map(Math.abs)
          ),
          0,
          d3.max(
            d3.extent(vis.mutEscape, vis.colorAccessorHeatmap).map(Math.abs)
          ),
        ])
        .range([vis.negativeColor, "white", vis.positiveColor]);
    } else {
      vis.colorScaleHeatmap
        .domain([0, d3.max(vis.mutEscape, vis.colorAccessorHeatmap)])
        .range(["white", vis.positiveColor]);
    }

    vis.renderVis();
  }
  /**
   * Bind data to visual elements.
   */
  renderVis() {
    let vis = this;

    // Draw the data:

    // ------ CONTEXT PLOT ------ //
    vis.contextArea = d3
      .area()
      .curve(d3.curveLinear)
      .x((d) => vis.xScaleContext(vis.xAccessorContext(d)))
      .y0(vis.yScaleContext(0))
      .y1((d) => vis.yScaleContext(vis.yAccessorContext(d)));
    vis.contextAreaG = vis.contextPlot
      .append("g")
      .attr("class", "context-area")
      .append("path")
      .attr("fill", vis.positiveColor)
      .attr("d", vis.contextArea(vis.mutEscapeSummary));

    // ------ FOCUS PLOT ------ // <== Add data join here
    vis.focusLine = d3
      .line()
      .curve(d3.curveLinear)
      .x((d) => vis.xScaleFocus(vis.xAccessorFocus(d)))
      .y((d) => vis.yScaleFocus(vis.yAccessorFocus(d)));
    vis.focusLineG = vis.focusPlot
      .append("g")
      .attr("class", "focus-line")
      .append("path")
      .attr("class", "line")
      .attr("clip-path", "url(#focusClipPath)")
      .attr("fill", "none")
      .attr("stroke", vis.positiveColor)
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("stroke-opacity", 1)
      .attr("d", vis.focusLine(vis.mutEscapeSummary));

    // vis.focusPoints = vis.focusPlot
    //   .append("g")
    //   .attr("fill", "white")
    //   .attr("stroke", vis.positiveColor)
    //   .attr("stroke-width", 2)
    //   .selectAll("circle")
    //   .data(vis.mutEscapeSummary)
    //   .join("circle")
    //   .attr("clip-path", "url(#focusClipPath)") // <-- *TEMP* adding a clip path, better to refactor as a group element
    //   .attr("cx", (d) => vis.xScaleFocus(vis.xAccessorFocus(d)))
    //   .attr("cy", (d) => vis.yScaleFocus(vis.yAccessorFocus(d)))
    //   .attr("r", 5);

    let transition = vis.svg.transition().duration(500);
    vis.focusPoints = vis.focusPlot
      .selectAll("circle")
      .data(vis.mutEscapeSummary, (d) => d.site)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("r", 5)
            .attr("cx", (d) => vis.xScaleFocus(vis.xAccessorFocus(d)))
            .attr("cy", (d) => vis.yScaleFocus(vis.yAccessorFocus(d)))
            .attr("clip-path", "url(#focusClipPath)")
            .attr("fill", "white")
            .attr("stroke", vis.positiveColor)
            .attr("stroke-width", 2)
            .filter((d) => d.site === vis.initSiteSelection)
            .attr("stroke", "black")
            .attr("stroke-width", 2),
        (update) =>
          update.call((update) =>
            update
              .transition(transition)
              .attr("cy", (d) => vis.yScaleFocus(vis.yAccessorFocus(d)))
          ),
        (exit) => exit.remove()
      );

    vis.focusPoints
      .on("mouseover", (evt, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(
            `Site: ${d.site}<br>Escape ${vis.configmetric}: ${d[
              vis.config.metric
            ].toFixed(4)}<br>Wildtype: ${d.wildtype}`
          )
          .style("border-color", vis.positiveColor);
      })
      .on("mousemove", (evt) => {
        vis.tooltip
          .style("top", evt.pageY - 10 + "px")
          .style("left", evt.pageX + 10 + "px");
      })
      .on("mouseout", () => {
        vis.tooltip.style("opacity", 0);
      });

    // ------ HEATMAP PLOT ------ //
    vis.heatmapPlot
      .append("g")
      .attr("class", "mutant")
      .selectAll("rect")
      .data(vis.mutEscapeHeatmap, (d) => d.mutant)
      .join("rect")
      .attr("x", (d) => vis.xScaleHeatmap(vis.xAccessorHeatmap(d)))
      .attr("y", (d) => vis.yScaleHeatmap(vis.yAccessorHeatmap(d)))
      .attr("width", vis.xScaleHeatmap.bandwidth())
      .attr("height", vis.yScaleHeatmap.bandwidth())
      .style("fill", (d) => vis.colorScaleHeatmap(vis.colorAccessorHeatmap(d)))
      .style("stroke", "black")
      .on("mouseover", (evt, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(`Escape: ${d.escape.toFixed(4)}`)
          .style("border-color", vis.positiveColor)
          .style("font-size", "1em");
      })
      .on("mousemove", (evt) => {
        vis.tooltip
          .style("top", evt.pageY - 10 + "px")
          .style("left", evt.pageX + 10 + "px");
      })
      .on("mouseout", () => {
        vis.tooltip.style("opacity", 0);
      });
    vis.heatmapPlot
      .selectAll("text")
      .data(vis.mutEscapeHeatmap, (d) => d.mutant)
      .join("text")
      .attr("class", "wildtype")
      .attr(
        "transform",
        `translate(${vis.xScaleHeatmap.bandwidth() / 2}, ${
          vis.yScaleHeatmap.bandwidth() / 2
        })`
      )
      .attr("x", (d) => vis.xScaleHeatmap(vis.xAccessorHeatmap(d)))
      .attr("y", (d) => vis.yScaleHeatmap(d.wildtype))
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .text("x");

    // Draw the peripherals (axes, labels, etc.):

    // ------ CONTEXT AXES ------ //
    vis.xAxisContextG
      .call(vis.xAxisContext)
      .call((g) => g.select(".domain").style("stroke-width", ".5"))
      .call((g) => g.selectAll(".tick").remove());
    vis.yAxisContextG.call(vis.yAxisContext);

    // ------ FOCUS AXES ------ //
    vis.xAxisFocusG
      .call(vis.xAxisFocus)
      .append("text")
      .attr("class", "axis-label")
      .text("Site")
      .attr("x", vis.bounds.focus.width / 2)
      .attr("y", 30)
      .attr("fill", "black")
      .attr("font-size", "16px")
      .attr("text-anchor", "middle");
    vis.yAxisFocusG
      .call(vis.yAxisFocus)
      .append("text")
      .attr("class", "axis-label")
      .text(
        `${
          vis.config.metric.charAt(0).toUpperCase() + vis.config.metric.slice(1)
        } of Escape`
      )
      .attr("transform", "rotate(-90)")
      .attr("x", -(vis.bounds.focus.height / 2))
      .attr("y", -30)
      .attr("fill", "black")
      .attr("font-size", "16px")
      .attr("text-anchor", "middle");

    // ------ HEATMAP AXES ------ //
    vis.xAxisHeatmapG.call(vis.xAxisHeatmap);
    vis.yAxisHeatmapG.call(vis.yAxisHeatmap);

    // ------ HEATMAP LEGEND ------ //
    vis.legendLinearGradient
      .selectAll("stop")
      .data(vis.colorScaleHeatmap.range())
      .join("stop")
      .attr("offset", (d, i) => i / (vis.colorScaleHeatmap.range().length - 1))
      .attr("stop-color", (d) => d);
    vis.legendScale = vis.colorScaleHeatmap
      .copy()
      .rangeRound(
        d3.quantize(
          d3.interpolate(vis.bounds.heatmap.height / 2, 0),
          vis.colorScaleHeatmap.range().length
        )
      );
    vis.legendAxis = d3.axisRight(vis.legendScale).ticks(6).tickSize(0);
    vis.legendAxisG = vis.heatmapLegend
      .append("g")
      .attr("transform", `translate(${vis.bounds.heatmap.width / 2})`)
      .call(vis.legendAxis)
      .call((g) => g.select(".domain").remove());
  }
}
