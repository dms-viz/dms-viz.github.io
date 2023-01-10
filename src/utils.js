import * as d3 from "d3";

// Summarize escape data
export function summarizeEscapeData(data) {
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
        site_reference: e.site_reference,
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
