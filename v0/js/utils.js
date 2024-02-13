import * as d3 from "d3";
import { marked } from "marked";
import katex from "katex";

// Summarize metric data
export function summarizeMetricData(data, excludedAminoAcids = null) {
  // Filter data if excludedAminoAcids is not null
  if (excludedAminoAcids) {
    data = data.filter((d) => !excludedAminoAcids.includes(d.mutant));
  }
  // Calculate summary stats for each site/condition pair
  const metricDataRollup = d3.rollup(
    data,
    (v) => {
      if (v.every((d) => d.metric === null)) {
        return {
          count: null,
          mean: null,
          sum: null,
          min: null,
          max: null,
          median: null,
        };
      }
      return {
        count: v.length,
        mean: d3.mean(v, (d) => d.metric),
        sum: d3.sum(v, (d) => d.metric),
        min: d3.min(v, (d) => d.metric),
        max: d3.max(v, (d) => d.metric),
        median: d3.median(v, (d) => d.metric),
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
        site_protein: String(e.site_protein),
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

// Calculate the complement color of a given hex color
export function invertColor(hexColor) {
  // Convert hex to RGB
  let r = parseInt(hexColor.slice(1, 3), 16);
  let g = parseInt(hexColor.slice(3, 5), 16);
  let b = parseInt(hexColor.slice(5, 7), 16);

  // Convert RGB to HSL
  (r /= 255), (g /= 255), (b /= 255);
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max == min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Calculate complement hue and convert HSL back to RGB
  h = (h + 0.5) % 1;
  let r1, g1, b1;
  if (s == 0) {
    r1 = g1 = b1 = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r1 = hue2rgb(p, q, h + 1 / 3);
    g1 = hue2rgb(p, q, h);
    b1 = hue2rgb(p, q, h - 1 / 3);
  }

  // Convert RGB back to hex
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  };
  return "#" + toHex(r1) + toHex(g1) + toHex(b1);
}

// Validate the specification object
export function validateSpecification(plotSpec) {
  const requiredKeys = ["mut_metric_df", "sitemap", "metric_col", "pdb"];

  for (const dataset in plotSpec) {
    const missingKeys = requiredKeys.filter(
      (key) => !(key in plotSpec[dataset])
    );

    if (missingKeys.length > 0) {
      throw new Error(
        `Invalid specification for dataset ${dataset}. Missing keys: ${missingKeys.join(
          ", "
        )}.`
      );
    }
  }
}

// Class to render markdown with KaTeX support
export class MarkdownRenderer extends marked.Renderer {
  constructor() {
    super();

    const originalRendererText = this.text;
    // Override the text function to add the KaTeX functionality
    this.text = (text) => {
      const mathReplacedText = this._replaceMathExpressions(text);
      return originalRendererText.call(this, mathReplacedText);
    };
  }

  // Replace math expressions
  _replaceMathExpressions(text) {
    return text
      .replace(/\$\$([\s\S]+?)\$\$/g, (match, p1) => {
        return katex.renderToString(p1, { displayMode: true });
      })
      .replace(/\$([\s\S]+?)\$/g, (match, p1) => {
        return katex.renderToString(p1, { displayMode: false });
      });
  }
}
