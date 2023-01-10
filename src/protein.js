import * as NGL from "ngl";
import * as d3 from "d3";
import { summarizeEscapeData, invertColor } from "./utils.js";

export class Protein {
  /**
   * Class constructor with initial configuration
   * @param {String}
   * @param {Object}
   */
  constructor(_data, _config) {
    this.config = _config;
    this.config = {
      parentElement: _config.parentElement,
      model: _config.model,
      epitope: _config.epitope,
      metric: _config.metric,
      floor: _config.floor,
      pdbID: _config.pdbID,
      dispatch: _config.dispatch,
      height: 500,
      backgroundColor: "#FFFFFF",
      proteinColor: "#D3D3D3",
    };
    this.data = _data;

    // Initialize the stage object for the parent element
    this.stage = new NGL.Stage(this.config.parentElement, {
      backgroundColor: this.config.backgroundColor,
    });

    // Load the protein structure
    this.load(this.config.pdbID);
  }
  /**
   * Load in the protein structure from a URL
   * @param {String}
   */
  load(pdbID) {
    let protein = this;
    // Turn the PDB ID into a URL
    protein.pdbURL = `rcsb://${pdbID}`;
    // Load the structure from a URL
    protein.stage.loadFile(protein.pdbURL).then(function (comp) {
      // Add representation
      comp.addRepresentation("cartoon", {
        color: protein.config.proteinColor,
      });
      // Set the zoom of the structure
      protein.stage.autoView();
      // Turn off the spinning animation
      protein.stage.setSpin(false);
      // Set the rotation of the structure
      comp.setRotation([2, 0, 0]);
      // Center and zoom the visualization to fit the protein structure
      comp.autoView();

      // Protein structure
      protein.component = comp;

      // Make test color scheme
      protein.makeColorScheme();

      // Attach dispatch event
      protein.config.dispatch.on("updateSites", (d) => {
        protein.selectSites(d.map((e) => parseInt(e.site_protein)));
      });
    });
  }
  /**
   * Make and Update the color scheme for the protein
   */
  makeColorScheme() {
    let protein = this;

    // Process DATA
    protein.mutEscape = protein.data[protein.config.model].mut_escape_df;
    protein.mutEscapeSummary = summarizeEscapeData(protein.mutEscape).filter(
      (e) => e.epitope === protein.config.epitope
    );

    // Make the COLOR SCALE
    protein.positiveColor =
      protein.data[protein.config.model].epitope_colors[protein.config.epitope];
    protein.negativeColor = invertColor(protein.positiveColor);
    // Color is dynamic depending on whether the data is floored
    protein.colorAccessor = (d) => {
      return protein.config.floor && d[protein.config.metric] < 0
        ? 0
        : d[protein.config.metric];
    };
    protein.metricExtent = d3
      .extent(protein.mutEscapeSummary, protein.colorAccessor)
      .map(Math.abs);
    // Make the color scale
    if (!protein.config.floor) {
      protein.colorScale = d3
        .scaleLinear()
        .domain([
          -d3.max(protein.metricExtent),
          0,
          d3.max(protein.metricExtent),
        ])
        .range([protein.negativeColor, "white", protein.positiveColor]);
    } else {
      protein.colorScale = d3
        .scaleLinear()
        .domain([0, d3.max(protein.mutEscapeSummary, protein.colorAccessor)])
        .range(["white", protein.positiveColor]);
    }
    // Use the scale function to map data to a color
    protein.colorMap = new Map(
      protein.mutEscapeSummary.map((d) => {
        return [
          parseInt(d.site_protein),
          protein.colorScale(d[protein.config.metric]),
        ];
      })
    );

    // Define a schemeId with the color registry for this data combination
    protein.schemeId = NGL.ColormakerRegistry.addScheme(function () {
      this.atomColor = (atom) => {
        if (protein.colorMap.has(atom.resno)) {
          // Color by array of escape summary - must be hexbase integer
          return parseInt(
            d3.color(protein.colorMap.get(atom.resno)).formatHex().slice(1),
            16
          );
        } else {
          // Use the background color for the rest of the protein
          return parseInt(protein.config.proteinColor.slice(1), 16);
        }
      };
    });

    // Run selectSites to update the color scheme
    protein.selectSites(
      d3
        .selectAll(".selected")
        .data()
        .map((e) => parseInt(e.site_protein))
    );
  }
  /**
   * Select sites on the protein structure to color
   * @param {Array}
   */
  selectSites(_sites) {
    let protein = this;

    // Dummy sites for now
    protein.selectedSites = _sites;

    // Function for converting sites into a selection string
    const makeSiteString = (site, chain) =>
      `${chain != "polymer" ? ":" : ""}${chain} and ${site}`;

    // Convert the selected sites into a selection string
    protein.currentSelection = protein.selectedSites.length
      ? protein.selectedSites
          .map((site) => makeSiteString(site, "polymer") + " or ")
          .join("")
      : undefined;

    if (protein.currentSelection !== undefined) {
      console.log("selecting some stuff");
      protein.stage.getRepresentationsByName("currentSelection").dispose();
      return protein.component
        .addRepresentation("spacefill", {
          color: protein.schemeId,
          roughness: 1,
          name: "currentSelection",
          surfaceType: "av",
        })
        .setSelection(protein.currentSelection);
    } else {
      protein.stage.getRepresentationsByName("currentSelection").dispose();
    }
  }
}
