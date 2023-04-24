/* Making a class to hold the chart code inspried by https://www.cs.ubc.ca/~tmm/courses/436V-20/reading/reusable_d3_components.pdf */
import * as d3 from "d3";
import { summarizeMetricData, invertColor } from "./utils.js";

export class Chart {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Object}
   */
  constructor(_config, _data) {
    this.config = _config;
    this.config = {
      experiment: _config.experiment,
      epitope: _config.epitope,
      summary: _config.summary,
      floor: _config.floor,
      metric: _config.metric,
      tooltips: _config.tooltips,
      parentElement: _config.parentElement,
      width: 1080,
      height: 300,
      scaling: {
        top: 0.025,
        left: 0.06,
        bottom: 0.15,
        right: 0.06,
        innerTop: 0.05,
        innerRight: 0.08,
        focusContextRatio: 0.15,
        focusHeatmapRatio: 0.03,
      },
    };
    // Data is a deep copy of the data
    this.data = JSON.parse(JSON.stringify(_data));
    this.dispatch = d3.dispatch("updateSites");

    this.initVis();
  }
  /**
   * Setup static elements like scales and axes
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

    vis.aspect = vis.config.width / vis.config.height;

    // Create the chart CANVAS
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.width)
      .attr("height", vis.config.height)
      .attr("class", "wrapper");

    // Make the chart responsive to resizing
    vis.svg
      .attr("viewBox", `0 0 ${vis.config.width} ${vis.config.height}`)
      .attr("preserveAspectRatio", "xMidYMid")
      .call(function () {
        vis.resize();
      });

    // Define chart AREA
    vis.boundedArea = vis.svg
      .append("g")
      .style(
        "transform",
        `translate(${vis.margin.left}px, ${vis.margin.top}px)`
      );

    // Define the elements of the CONTEXT
    vis.contextPlot = vis.boundedArea.append("g").attr("class", "context");

    // Add the clip path for the context
    vis.contextPlot
      .append("clipPath")
      .attr("id", "contextClipPath")
      .append("rect")
      .attr("width", vis.bounds.context.width)
      .attr("height", vis.bounds.context.height);

    // Define the elements of the FOCUS
    vis.focusPlot = vis.boundedArea
      .append("g")
      .style(
        "transform",
        `translateY(${vis.margin.innerTop + vis.bounds.context.height}px)`
      )
      .attr("class", "focus")
      .on("dblclick", function () {
        vis.deselectSites();
      });

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

    // Define the elements of the HEATMAP LEGEND
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

    // Define the TOOLTIP
    vis.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0);

    // Initialize SCALES
    vis.yScaleContext = d3.scaleLinear().range([vis.bounds.context.height, 0]);
    vis.xScaleContext = d3
      .scaleLinear()
      .range([0, vis.bounds.context.width])
      .nice();
    vis.xScaleFocus = d3
      .scaleLinear()
      .range([0, vis.bounds.focus.width])
      .nice();
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
    vis.legendScaleHeatmap = vis.colorScaleHeatmap.copy();

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
    vis.xAxisFocusG
      .append("text")
      .attr("class", "axis-label")
      .attr("x", vis.bounds.focus.width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .attr("font-size", "16px")
      .attr("text-anchor", "middle")
      .text("Site");
    vis.yAxisFocus = d3.axisLeft(vis.yScaleFocus).tickSizeOuter(0);
    vis.yAxisFocusG = vis.focusPlot.append("g").attr("class", "axis y-axis");
    vis.yAxisFocusG
      .append("text")
      .attr("class", "axis-label")
      .text(
        `${
          vis.config.summary.charAt(0).toUpperCase() +
          vis.config.summary.slice(1)
        } of ${vis.config.metric}`
      )
      .attr("transform", "rotate(-90)")
      .attr("x", -(vis.bounds.focus.height / 2))
      .attr("y", -40)
      .attr("fill", "black")
      .attr("font-size", "16px")
      .attr("text-anchor", "middle");
    vis.xAxisHeatmap = d3.axisBottom(vis.xScaleHeatmap).tickSizeOuter(0);
    vis.xAxisHeatmapG = vis.heatmapPlot
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0, ${vis.bounds.heatmap.height})`);
    vis.yAxisHeatmap = d3.axisLeft(vis.yScaleHeatmap).tickSizeOuter(0);
    vis.yAxisHeatmapG = vis.heatmapPlot
      .append("g")
      .attr("class", "axis y-axis");
    vis.yAxisHeatmapLegend = d3
      .axisRight(vis.legendScaleHeatmap)
      .ticks(6)
      .tickSize(0);
    vis.yAxisHeatmapLegendG = vis.heatmapLegend
      .append("g")
      .attr("transform", `translate(${vis.bounds.heatmap.width / 2})`)
      .attr("class", "axis legend-axis");

    // Initialize CONTEXT BRUSH component
    vis.brushG = vis.contextPlot
      .append("g")
      .attr("class", "brush context-brush");

    vis.brush = d3
      .brushX()
      .extent([
        [0, 0],
        [vis.bounds.context.width, vis.bounds.context.height],
      ])
      .on("brush", function (event) {
        // DEBUG MESSAGE
        if (event.selection) vis.brushed(event.selection);
      })
      .on("end", function (event) {
        // DEBUG MESSAGE
        if (!event.selection) vis.brushed(null);
      });

    // Initialize FOCUS BRUSH component
    vis.focusBrushG = vis.focusPlot
      .append("g")
      .attr("class", "brush focus-brush");

    vis.focusBrush = d3
      .brush()
      .extent([
        [0, 0],
        [vis.bounds.focus.width, vis.bounds.focus.height + 5], // There needs to be y-padding if you floor the values
      ])
      .on("end", function (event) {
        if (event.selection) vis.brushedPoints(event.selection);
      })
      .keyModifiers(false);

    // UPDATE
    vis.updateVis();
  }
  /**
   * Prepare the data and scales before rendering
   */
  updateVis() {
    let vis = this;

    // Process DATA
    vis.originalMutMetric = vis.data[vis.config.experiment].mut_metric_df;
    vis.mutMetric = vis.originalMutMetric.map((d, i) => {
      let newRow = { ...d }; // make a copy of the original object
      if (vis.maskedIndicies && vis.maskedIndicies.includes(i)) {
        newRow.metric = null;
      }
      return newRow;
    });
    // Summarize and filter the experiments based on the selections
    vis.mutMetricSummary = summarizeMetricData(vis.mutMetric).filter(
      (e) => e.epitope === vis.config.epitope
    );
    // Filter out the sites where the metric is undefined
    vis.filteredMutMetricSummary = vis.mutMetricSummary.filter(
      (d) => d[vis.config.summary] !== null
    );
    // Pick the site with the highest metric for the selected summary metric
    vis.initSiteSelection = vis.mutMetricSummary.filter(
      (d) =>
        d[vis.config.summary] ===
        d3.max(vis.mutMetricSummary, (d) => d[vis.config.summary])
    )[0].site;
    // Initialize the heatmap data for the selected site
    vis.mutMetricHeatmap = vis.mutMetric.filter(
      (e) =>
        e.site === vis.initSiteSelection && e.epitope === vis.config.epitope
    );
    // Make the color scheme for the plots
    vis.positiveColor =
      vis.data[vis.config.experiment].epitope_colors[vis.config.epitope];
    vis.negativeColor = invertColor(vis.positiveColor);
    // Get the amino acid alphabet for the experiment
    vis.alphabet = vis.data[vis.config.experiment].alphabet;

    // Make a map for the sequential site to the labels used on the x-axis
    vis.siteMap = new Map();
    Object.entries(vis.data[vis.config.experiment].sitemap).forEach((entry) => {
      const [key, value] = entry;
      vis.siteMap.set(value.sequential_site, key);
    });

    // Define ACCESSORS
    vis.xAccessorContext = (d) => d.site;
    vis.yAccessorContext = (d) => {
      return vis.config.floor && d[vis.config.summary] < 0
        ? 0
        : d[vis.config.summary];
    };
    vis.xAccessorFocus = (d) => d.site;
    vis.yAccessorFocus = (d) => {
      return vis.config.floor && d[vis.config.summary] < 0
        ? 0
        : d[vis.config.summary];
    };
    vis.xAccessorHeatmap = (d) => d.site;
    vis.yAccessorHeatmap = (d) => d.mutant;
    vis.colorAccessorHeatmap = (d) => {
      return vis.config.floor && d.metric < 0 ? 0 : d.metric;
    };

    // Update SCALES
    // Adjust the domain to add some padding to each scale
    const xExtentFocus = d3.extent(vis.mutMetricSummary, vis.xAccessorFocus);
    const xRangeFocus = xExtentFocus[1] - xExtentFocus[0];
    const yExtentFocus = d3.extent(vis.mutMetricSummary, vis.yAccessorFocus);
    const yRangeFocus = yExtentFocus[1] - yExtentFocus[0];
    vis.yScaleContext.domain([
      yExtentFocus[0],
      yExtentFocus[1] + yRangeFocus * 0.05,
    ]);
    vis.xScaleContext.domain([
      xExtentFocus[0],
      xExtentFocus[1] + xRangeFocus * 0.05,
    ]);
    vis.xScaleFocus.domain([
      xExtentFocus[0],
      xExtentFocus[1] + xRangeFocus * 0.05,
    ]);
    vis.yScaleFocus.domain([
      yExtentFocus[0],
      yExtentFocus[1] + yRangeFocus * 0.05,
    ]);
    vis.xScaleHeatmap.domain([
      d3.max(vis.mutMetricHeatmap, vis.xAccessorHeatmap),
    ]);
    vis.yScaleHeatmap.domain(vis.alphabet);
    // Color is dynamic depending on whether the data is floored
    if (!vis.config.floor) {
      vis.colorScaleHeatmap
        .domain([
          -d3.max(
            d3
              .extent(vis.originalMutMetric, vis.colorAccessorHeatmap)
              .map(Math.abs)
          ),
          0,
          d3.max(
            d3
              .extent(vis.originalMutMetric, vis.colorAccessorHeatmap)
              .map(Math.abs)
          ),
        ])
        .range([vis.negativeColor, "white", vis.positiveColor]);
    } else {
      vis.colorScaleHeatmap
        .domain([0, d3.max(vis.originalMutMetric, vis.colorAccessorHeatmap)])
        .range(["white", vis.positiveColor]);
    }
    vis.legendScaleHeatmap
      .domain(vis.colorScaleHeatmap.domain())
      .rangeRound(
        d3.quantize(
          d3.interpolate(vis.bounds.heatmap.height / 2, 0),
          vis.colorScaleHeatmap.range().length
        )
      );

    // define a function to make the tooltip html
    vis.tooltipContent = (d) => {
      // default tooltip html
      const defaultTooltip = `${vis.config.metric}: ${
        d.metric !== null ? d.metric.toFixed(2) : "Filtered"
      }</br>`;
      // if the tooltips exist, add them to the html
      if (vis.config.tooltips) {
        const lines = Object.entries(vis.config.tooltips).map(
          ([column, name]) =>
            `${name}: ${
              typeof d[column] === "number" ? d[column].toFixed(2) : d[column]
            }</br>`
        );
        return defaultTooltip + lines.join("");
      } else {
        return defaultTooltip;
      }
    };

    // make the path GENERATORS
    vis.contextArea = d3
      .area()
      .curve(d3.curveLinear)
      .x((d) => vis.xScaleContext(vis.xAccessorContext(d)))
      .y0(vis.yScaleContext(0))
      .y1((d) => vis.yScaleContext(vis.yAccessorContext(d) || 0));
    vis.focusLine = d3
      .line()
      .curve(d3.curveLinear)
      .x((d) => vis.xScaleFocus(vis.xAccessorFocus(d)))
      .y((d) => vis.yScaleFocus(vis.yAccessorFocus(d) || 0));

    // RENDER
    vis.renderVis();
  }
  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    // Draw the CONTEXT plot
    vis.contextPlot
      .selectAll(".context-area")
      .data(vis.mutMetricSummary, (d) => d.site)
      .join("path")
      .attr("class", "context-area")
      .attr("clip-path", "url(#contextClipPath)")
      .attr("d", (d, i) =>
        i < vis.mutMetricSummary.length - 1 &&
        d.site + 1 === vis.mutMetricSummary[i + 1].site
          ? vis.contextArea([d, vis.mutMetricSummary[i + 1]])
          : null
      )
      .attr("fill", vis.positiveColor);

    // Draw the FOCUS plot
    vis.focusPlot
      .selectAll(".focus-line")
      .data(vis.mutMetricSummary, (d) => d.site)
      .join("path")
      .attr("class", "focus-line")
      .attr("clip-path", "url(#focusClipPath)")
      .attr("fill", "none")
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("stroke-opacity", 1)
      .attr("stroke", vis.positiveColor)
      .attr("d", (d, i) =>
        i < vis.mutMetricSummary.length - 1 &&
        d.site + 1 === vis.mutMetricSummary[i + 1].site
          ? vis.focusLine([d, vis.mutMetricSummary[i + 1]])
          : null
      );

    vis.focusPlot
      .selectAll("circle")
      .data(vis.filteredMutMetricSummary, (d) => d.site)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("cy", (d) => vis.yScaleFocus(vis.yAccessorFocus(d))),
        (update) =>
          update.call((update) =>
            update.attr("cy", (d) => vis.yScaleFocus(vis.yAccessorFocus(d)))
          ),
        (exit) => exit.remove()
      )
      .attr("cx", (d) => vis.xScaleFocus(vis.xAccessorFocus(d)))
      .attr("r", 5)
      .attr("clip-path", "url(#focusClipPath)")
      .attr("fill", "white")
      .attr("stroke", vis.positiveColor)
      .attr("stroke-width", 2)
      .on("mouseover", (evt, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(
            `Site: ${d.site_reference}<br>${vis.config.metric} ${
              vis.config.summary
            }: ${d[vis.config.summary].toFixed(2)}<br>Wildtype: ${d.wildtype}`
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
      })
      .on("click", function (evt, d) {
        vis.updateHeatmap(d);
      });

    // Color in the selected points
    vis.focusPlot.selectAll(".selected").attr("fill", vis.positiveColor);

    // Color in the heatmap point
    vis.focusPlot
      .selectAll("circle")
      .filter(
        (d) =>
          d.site === vis.initSiteSelection && d.epitope === vis.config.epitope
      )
      .classed("heatmap-site", true)
      .attr("r", 8)
      .attr("stroke", "black")
      .attr("stroke-width", 4);

    // Draw the HEATMAP plot
    vis.heatmapPlot
      .selectAll(".mutant-rect")
      .data(vis.mutMetricHeatmap, (d) => d.mutation)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "mutant-rect")
            .style("fill", (d) =>
              vis.colorAccessorHeatmap(d) !== null
                ? vis.colorScaleHeatmap(vis.colorAccessorHeatmap(d))
                : "grey"
            )
            .style("stroke", "black"),
        (update) =>
          update.call((update) =>
            update.style("fill", (d) =>
              vis.colorAccessorHeatmap(d) !== null
                ? vis.colorScaleHeatmap(vis.colorAccessorHeatmap(d))
                : "grey"
            )
          ),
        (exit) => exit.remove()
      )
      .attr("x", (d) => vis.xScaleHeatmap(vis.xAccessorHeatmap(d)))
      .attr("y", (d) => vis.yScaleHeatmap(vis.yAccessorHeatmap(d)))
      .attr("width", vis.xScaleHeatmap.bandwidth())
      .attr("height", vis.yScaleHeatmap.bandwidth())
      .on("mouseover", (evt, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(vis.tooltipContent(d))
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

    // Add an 'x' for the wildtype residue
    vis.wildtype = vis.mutMetricHeatmap.map((d) => d.wildtype)[0];
    vis.heatmapPlot
      .selectAll(".wildtype-text")
      .data([vis.wildtype], (d) => d)
      .join("text")
      .attr("class", "wildtype-text")
      .attr(
        "transform",
        `translate(${vis.bounds.heatmap.width / 2}, ${
          vis.yScaleHeatmap.bandwidth() / 2
        })`
      )
      .attr("y", (d) => vis.yScaleHeatmap(d))
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", "1em")
      .attr("font-weight", "bold")
      .text("x");

    // Draw the peripherals (axes, labels, etc.):

    // Peripherals for the CONTEXT plot
    vis.xAxisContextG
      .call(vis.xAxisContext)
      .call((g) => g.select(".domain").style("stroke-width", ".5"))
      .call((g) => g.selectAll(".tick").remove());
    vis.yAxisContextG.call(vis.yAxisContext);

    // Peripherals for the FOCUS plot
    vis.xAxisFocusG.call(
      vis.xAxisFocus.tickFormat(function (d) {
        return vis.siteMap.get(d);
      })
    );
    vis.yAxisFocusG.call(vis.yAxisFocus);
    vis.yAxisFocusG
      .select(".axis-label")
      .text(
        `${
          vis.config.summary.charAt(0).toUpperCase() +
          vis.config.summary.slice(1)
        } of ${vis.config.metric}`
      );

    // Peripherals for the HEATMAP plot
    vis.xAxisHeatmapG.call(
      vis.xAxisHeatmap.tickFormat(function (d) {
        return vis.siteMap.get(d);
      })
    );
    vis.yAxisHeatmapG.call(vis.yAxisHeatmap);

    // Peripherals for the HEATMAP legend
    vis.legendLinearGradient
      .selectAll("stop")
      .data(vis.colorScaleHeatmap.range())
      .join("stop")
      .attr("offset", (d, i) => i / (vis.colorScaleHeatmap.range().length - 1))
      .attr("stop-color", (d) => d);
    vis.yAxisHeatmapLegendG
      .call(vis.yAxisHeatmapLegend)
      .call((g) => g.select(".domain").remove());

    vis.brushSelection = vis.brushSelection || null;
    vis.brushG.call(vis.brush).call(vis.brush.move, vis.brushSelection);

    vis.focusBrushG.call(vis.focusBrush);
  }
  /**
   * React to brush events in the context plot.
   */
  brushed(selection) {
    let vis = this;

    // Check if the brush is still active or if it has been removed
    if (selection) {
      // Convert given pixel coordinates (range: [x0,x1]) into the site domain
      const selectedDomain = selection.map(
        vis.xScaleContext.invert,
        vis.xScaleContext
      );
      // Update x-scale of the focus view accordingly
      vis.xScaleFocus.domain(selectedDomain);
    } else {
      // Reset x-scale of the focus view to the original domain
      vis.xScaleFocus.domain(vis.xScaleContext.domain());
    }
    // DEBUG MESSAGE
    vis.brushSelection = selection;

    // Redraw line and update x-axis labels in focus view
    vis.focusPlot
      .selectAll(".focus-line")
      .attr("d", (d, i) =>
        i < vis.mutMetricSummary.length - 1 &&
        d.site + 1 === vis.mutMetricSummary[i + 1].site
          ? vis.focusLine([d, vis.mutMetricSummary[i + 1]])
          : null
      );
    vis.focusPlot
      .selectAll("circle")
      .attr("cx", (d) => vis.xScaleFocus(vis.xAccessorFocus(d)));
    // Update the x axis of the focus plot based on selection
    vis.xAxisFocusG.call(vis.xAxisFocus);
  }
  /**
   * React to brush events in the focus plot
   */
  brushedPoints(selection) {
    let vis = this;

    if (selection) {
      // Destructure the selection bounds
      const [[x0, y0], [x1, y1]] = selection;

      // Save the `value` as the data attached to each node
      vis.focusPlot
        .selectAll("circle")
        .filter(
          (d) =>
            x0 <= vis.xScaleFocus(vis.xAccessorFocus(d)) &&
            vis.xScaleFocus(vis.xAccessorFocus(d)) < x1 &&
            y0 <= vis.yScaleFocus(vis.yAccessorFocus(d)) &&
            vis.yScaleFocus(vis.yAccessorFocus(d)) < y1
        )
        .classed("selected", true)
        .attr("fill", vis.positiveColor);

      // Clear the brush
      vis.focusPlot.select(".focus-brush").call(vis.focusBrush.move, null);

      // Dispatch an event with the selected sites
      this.dispatch.call(
        "updateSites",
        this,
        vis.focusPlot.selectAll(".selected").data()
      );
    }
  }
  /**
   * Deselect all points in the focus plot
   */
  deselectSites() {
    let vis = this;

    vis.focusPlot
      .selectAll(".selected")
      .classed("selected", false)
      .attr("fill", "white");

    this.dispatch.call("updateSites", this, []);
  }
  /**
   * React to click events on focus points
   */
  updateHeatmap(datum) {
    let vis = this;

    // Get the site information from the datum
    const site = datum.site;
    const epitope = datum.epitope;
    vis.wildtype = datum.wildtype;

    // Remove the previously selected site from the focus plot
    vis.focusPlot
      .selectAll(".heatmap-site")
      .attr("r", 5)
      .attr("stroke-width", 2)
      .attr("stroke", vis.positiveColor)
      .classed("heatmap-site", false);

    // Highlight the selected site in the focus plot
    vis.focusPlot
      .selectAll("circle")
      .filter((d) => d.site === site && d.epitope === epitope)
      .classed("heatmap-site", true)
      .attr("r", 8)
      .attr("stroke", "black")
      .attr("stroke-width", 4);

    // Initialize the heatmap data for the selected site
    vis.mutMetricHeatmap = vis.mutMetric.filter(
      (e) => e.site === site && e.epitope === epitope
    );

    // Update the scale based on the site
    vis.xScaleHeatmap.domain([site]);

    // Re-draw the x-axis based on the updated scale
    vis.xAxisHeatmapG.call(vis.xAxisHeatmap);

    // Update the heatmap to be this site
    vis.heatmapPlot
      .selectAll(".mutant-rect")
      .data(vis.mutMetricHeatmap, (d) => d.mutation)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "mutant-rect")
            .style("fill", (d) =>
              vis.colorAccessorHeatmap(d) !== null
                ? vis.colorScaleHeatmap(vis.colorAccessorHeatmap(d))
                : "grey"
            )
            .style("stroke", "black"),
        (update) =>
          update.call((update) =>
            update.style("fill", (d) =>
              vis.colorAccessorHeatmap(d) !== null
                ? vis.colorScaleHeatmap(vis.colorAccessorHeatmap(d))
                : "grey"
            )
          ),
        (exit) => exit.remove()
      )
      .attr("x", (d) => vis.xScaleHeatmap(vis.xAccessorHeatmap(d)))
      .attr("y", (d) => vis.yScaleHeatmap(vis.yAccessorHeatmap(d)))
      .attr("width", vis.xScaleHeatmap.bandwidth())
      .attr("height", vis.yScaleHeatmap.bandwidth())
      .on("mouseover", (evt, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(vis.tooltipContent(d))
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
      .selectAll(".wildtype-text")
      .data([vis.wildtype], (d) => d)
      .join("text")
      .attr("class", "wildtype-text")
      .attr(
        "transform",
        `translate(${vis.bounds.heatmap.width / 2}, ${
          vis.yScaleHeatmap.bandwidth() / 2
        })`
      )
      .attr("y", (d) => vis.yScaleHeatmap(d))
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", "1em")
      .attr("font-weight", "bold")
      .text("x");
  }
  /**
   * React to the window being resized
   */
  resize() {
    let vis = this;

    // Get the parent node of the SVG element
    const parentNode = d3.select(vis.config.parentElement).node();

    // Derive the new width and height of the SVG element
    vis.config.width = parentNode.offsetWidth;
    vis.config.height = parentNode.offsetHeight;

    // Resize the SVG element
    vis.svg
      .attr("width", vis.config.width)
      .attr("height", vis.config.width / vis.aspect);
  }
}
