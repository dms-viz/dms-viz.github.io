import * as d3 from "d3";

// Summarize metric data
export function summarizeMetricData(data) {
  // Calculate summary stats for each site/condition pair
  const metricDataRollup = d3.rollup(
    data,
    (v) => {
      if (v.every((d) => d.metric === null)) {
        return {
          mean: null,
          sum: null,
          min: null,
          max: null,
        };
      }
      return {
        mean: d3.mean(v, (d) => d.metric),
        sum: d3.sum(v, (d) => d.metric),
        min: d3.min(v, (d) => d.metric),
        max: d3.max(v, (d) => d.metric),
      };
    },
    (d) => d.site,
    (d) => d.condition
  );

  // Join the map of summarized metric back to the original
  const metricDataSummary = data
    .map((e) => {
      return {
        condition: e.condition,
        site: e.site,
        site_reference: e.site_reference,
        site_protein: e.site_protein,
        site_chain: e.site_chain,
        wildtype: e.wildtype,
        ...metricDataRollup.get(e.site).get(e.condition),
      };
    })
    .filter(
      (element, index, self) =>
        index ===
        self.findIndex(
          (e) => e.site === element.site && e.condition === element.condition
        )
    );

  return metricDataSummary;
}

// Find the complement of a hex color string
export function invertColor(hexColor) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const complement =
    "#" + ((0xffffff ^ ((r << 16) | (g << 8) | b)) >>> 0).toString(16);
  return complement;
}
