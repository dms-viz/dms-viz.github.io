import * as NGL from "ngl";
import * as d3 from "d3";
import { summarizeEscapeData, invertColor } from "./utils.js";

export class Protein {
  /**
   * Class constructor with initial configuration
   * @param {Object}
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
      stageColor: "#FFFFFF",
      proteinRepresentation: "cartoon",
      selectionRepresentation: "spacefill",
      backgroundRepresentation: "rope",
      proteinColor: "#D3D3D3",
      backgroundColor: "#D3D3D3",
    };
    this.data = _data;

    // Initialize the stage object for the parent element
    this.stage = new NGL.Stage(this.config.parentElement, {
      backgroundColor: this.config.stageColor,
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

    // Determine if the strcutre is custom or from the RCSB PDB
    if (pdbID.slice(-4) !== ".pdb") {
      // Set the pdbURL to the RCSB PDB URL
      protein.pdbURL = `rcsb://${pdbID}`;
    } else {
      // Set the pdbURL to the local file
      protein.pdbURL = `https://github.com/dms-viz/dms-viz.github.io/blob/main/data/pdbs/${pdbID}`;
    }

    // Determine how to handle the chains in the protein structure
    protein.dataChains = protein.data[protein.config.model].dataChains;
    protein.excludeChains = protein.data[protein.config.model].excludeChains;

    // Make the selection of chains to include in the protein structure
    if (protein.dataChains != "polymer") {
      protein.dataChainSelection = `:${protein.dataChains.join(" or :")}`;
      protein.backgroundChainSelection = `not :${protein.dataChains.join(
        " and not :"
      )}`;
      if (protein.excludeChains != "none") {
        protein.backgroundChainSelection += ` and not :${protein.excludeChains.join(
          " and not :"
        )}`;
      }
    } else {
      protein.dataChainSelection = "polymer";
      protein.backgroundChainSelection = "none";
    }

    console.log(protein.dataChainSelection);
    console.log(protein.backgroundChainSelection);

    // Load the structure from a URL
    protein.stage.loadFile(protein.pdbURL).then(function (comp) {
      // Add base protein representation
      comp.addRepresentation(protein.config.proteinRepresentation, {
        sele: protein.dataChainSelection,
        color: protein.config.proteinColor,
      });

      // Add background representation for non-data chains and non-excluded chains
      if (protein.backgroundChainSelection != "none") {
        comp.addRepresentation(protein.config.backgroundRepresentation, {
          sele: protein.backgroundChainSelection,
          color: protein.config.backgroundColor,
        });
      }

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
        protein.selectSites(d);
      });
    });
  }
  /**
   * Clear the protein structure and reload it
   */
  clear() {
    let protein = this;

    // Clear the protein structure
    protein.stage.removeAllComponents();
    protein.load(protein.config.pdbID);
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
    protein.selectSites(d3.selectAll(".selected").data());
  }
  /**
   * Format site string for selection
   * @param {Int16Array}
   * @param {String}
   */
  _makeSiteString(site, chain) {
    return `${chain != "polymer" ? ":" : ""}${chain} and ${site}`;
  }
  /**
   * Select sites on the protein structure to color
   * @param {Array}
   */
  selectSites(data) {
    let protein = this;

    // Define a placeholder for the selected sites
    protein.selectedSitesStrings = [];

    // Iterate over each selected data point
    data.forEach((d) => {
      // Get the residue number on the protein structure
      const site = d.site_protein;
      // Get the chains on the protein structure for this site
      const chains = d.site_chain.split(" ");

      // Only make site strings for site on the protein structure
      if (isNaN(parseInt(site))) {
        return;
      } else {
        // For each chain in chains, make the site string
        const siteStrings = chains
          .map((chain) => protein._makeSiteString(site, chain))
          .join(" or ");
        // Add the site string to the array of selected sites
        protein.selectedSitesStrings.push(siteStrings);
      }
    });

    // Convert the selected sites into a selection string
    protein.currentSelectionSiteString = protein.selectedSitesStrings.length
      ? protein.selectedSitesStrings.join(" or ")
      : undefined;

    // Create a representation of the selected sites on the protein structure
    if (protein.currentSelectionSiteString !== undefined) {
      console.log("selecting some new stuff");
      protein.stage.getRepresentationsByName("currentSelection").dispose();
      return protein.component
        .addRepresentation(protein.config.selectionRepresentation, {
          color: protein.schemeId,
          roughness: 1,
          name: "currentSelection",
          surfaceType: "av",
        })
        .setSelection(protein.currentSelectionSiteString);
    } else {
      protein.stage.getRepresentationsByName("currentSelection").dispose();
    }
  }
}
