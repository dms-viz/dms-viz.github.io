import * as NGL from "ngl";
import * as d3 from "d3";
import { summarizeMetricData, invertColor } from "./utils.js";
import { Alerts } from "./ui.js";

export class Protein {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Object}
   */
  constructor(_config, _data) {
    this.config = _config;
    this.config = {
      ..._config,
    };
    this.data = _data;
    this.initStage();
  }
  /**
   * Initialize the NGL stage object
   */
  initStage() {
    let protein = this;

    // Clear any existing stage objects and tooltips
    document.getElementById(protein.config.parentElement).innerHTML = "";
    if (document.querySelector(".protein-tooltip")) {
      document.querySelector(".protein-tooltip").remove();
    }

    // Initialize the stage object for the target element
    protein.stage = new NGL.Stage(protein.config.parentElement, {
      backgroundColor: "#FFFFFF",
    });

    // Set the initial size of the stage
    protein.resize();

    // Make a map from the structure numbering to the reference numbering
    const refMap = protein.data[protein.config.dataset].mut_metric_df.reduce(
      (acc, current) => {
        acc[current.site_protein] = current.site_reference;
        return acc;
      },
      {}
    );

    // Add a tooltip to the stage object
    const tooltip = document.createElement("div");
    tooltip.className = "protein-tooltip";
    document.body.appendChild(tooltip);
    protein.stage.mouseControls.remove("hoverPick");
    protein.stage.signals.hovered.add(function (pickingProxy) {
      if (pickingProxy && pickingProxy.atom) {
        let atom = pickingProxy.atom;
        tooltip.innerHTML = `<strong>Site:</strong> ${[
          refMap[atom.resno],
        ]} </br > <strong>Residue:</strong> ${
          atom.resname
        }${protein.#getOneLetterCode(
          atom.resname
        )} </br > <strong>Chain:</strong> ${atom.chainname}`;
        tooltip.style.display = "block";
      } else {
        tooltip.style.display = "none";
      }
    });
    // Register an event listeners for mouse position on the viewport
    protein.stage.viewer.container.addEventListener("mousemove", (e) => {
      tooltip.style.top = e.pageY - 10 + "px";
      tooltip.style.left = e.pageX + 10 + "px";
    });
    protein.stage.viewer.container.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    // Load the protein structure
    protein.load();
  }
  /**
   * Load in the protein structure
   */
  load() {
    let protein = this;

    // Determine if the structure is a local or hosted by the RCSB
    if (protein.config.pdbID.length == 4) {
      protein.structure = `rcsb://${protein.config.pdbID}`;
      protein.loadConfig = {};
    } else {
      protein.structure = new Blob([protein.config.pdbID], {
        type: "text/plain",
      });
      protein.loadConfig = { ext: "pdb" };
    }

    // Get the chain selections for the protein structure
    let dataChains = protein.data[protein.config.dataset].dataChains;
    let excludeChains = protein.data[protein.config.dataset].excludeChains;

    // Make the selection of chains to include in the protein structure
    if (dataChains != "polymer") {
      protein.dataChainSelection = `:${dataChains.join(" or :")}`;
      protein.backgroundChainSelection = `not :${dataChains.join(
        " and not :"
      )}`;
      if (excludeChains != "none") {
        protein.backgroundChainSelection += ` and not :${excludeChains.join(
          " and not :"
        )}`;
      }
    } else {
      protein.dataChainSelection = "polymer";
      protein.backgroundChainSelection = "none";
    }

    // Load the protein structure
    protein.stage
      .loadFile(protein.structure, protein.loadConfig)
      .then(function (component) {
        // Save the loaded protein structure
        protein.component = component;
        // Attach the chart's site selection
        protein.config.dispatch.on("updateSites", (d) => {
          protein.selectSites(d);
        });
        // Update the structure representation
        protein.updateRepresentation();
        protein.updateData();
        // Set the initial zoom
        protein.stage.autoView();
      })
      .catch(function (error) {
        const alert = new Alerts();
        alert.showAlert(`Failed to load protein: (${error})`);
      });
  }
  /**
   * Update the representation of the protein structure
   */
  updateRepresentation() {
    let protein = this;

    protein.stage.getRepresentationsByName("dataChains").dispose();
    protein.component.addRepresentation(protein.config.proteinRepresentation, {
      sele: protein.dataChainSelection,
      color: protein.config.proteinColor,
      opacity: protein.config.proteinOpacity,
      name: "dataChains",
      smoothSheet: true,
      side: "front",
    });
    protein.stage.getRepresentationsByName("backgroundChains").dispose();
    if (protein.backgroundChainSelection != "none") {
      protein.component.addRepresentation(
        protein.config.backgroundRepresentation,
        {
          sele: protein.backgroundChainSelection,
          color: protein.config.backgroundColor,
          opacity: protein.config.backgroundOpacity,
          name: "backgroundChains",
          smoothSheet: true,
          side: "front",
        }
      );
    }
    protein.stage.getRepresentationsByName("ligands").dispose();
    if (protein.config.showGlycans) {
      protein.component.addRepresentation(protein.config.ligandRepresentation, {
        sele: "ligand and not protein",
        color: protein.config.ligandColor,
        name: "ligands",
      });
    }
    if (protein.currentSelectionSiteString !== undefined) {
      protein.stage.getRepresentationsByName("currentSelection").setParameters({
        opacity: protein.config.selectionOpacity,
      });
      if (
        protein.config.selectionRepresentation !==
        protein.stage.getRepresentationsByName("currentSelection")["list"][0]
          .repr.type
      ) {
        protein.selectSites(d3.selectAll(".selected").data());
      }
    }
  }
  /**
   * Update the component representations and color
   */
  updateData() {
    let protein = this;

    // Summarize the data
    protein.mutMetric = protein.data[protein.config.dataset].mut_metric_df;
    protein.mutMetricSummary = summarizeMetricData(protein.mutMetric).filter(
      (e) => e.condition === protein.config.proteinCondition
    );

    // Set up the accessor function
    protein.colorAccessor = (d) => {
      return protein.config.floor && d[protein.config.summary] < 0
        ? 0
        : d[protein.config.summary];
    };

    // Update the color scale
    const positiveColor =
      protein.data[protein.config.dataset].condition_colors[
        protein.config.proteinCondition
      ];
    const negativeColor = invertColor(positiveColor);
    const metricExtent = d3
      .extent(protein.mutMetricSummary, protein.colorAccessor)
      .map(Math.abs);
    if (!protein.config.floor) {
      protein.colorScale = d3
        .scaleLinear()
        .domain([-d3.max(metricExtent), 0, d3.max(metricExtent)])
        .range([negativeColor, "white", positiveColor]);
    } else {
      protein.colorScale = d3
        .scaleLinear()
        .domain([0, d3.max(protein.mutMetricSummary, protein.colorAccessor)])
        .range(["white", positiveColor]);
    }

    // Use the scale function to map site data to a color
    protein.colorMap = new Map(
      protein.mutMetricSummary.map((d) => {
        return [
          parseInt(d.site_protein),
          protein.colorScale(d[protein.config.summary]),
        ];
      })
    );

    // Add the schemeId with the color registry for this data combination
    protein.schemeId = NGL.ColormakerRegistry.addScheme(function () {
      this.atomColor = (atom) => {
        if (protein.colorMap.has(atom.resno)) {
          // Color by array of metric summary - must be hexbase integer
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

    // Recolor the current selection
    if (protein.currentSelectionSiteString !== undefined) {
      protein.stage.getRepresentationsByName("currentSelection").setParameters({
        color: protein.schemeId,
      });
    }
  }
  /**
   * Select sites on the protein structure based on the chart selection
   * @param {Array}
   */
  selectSites(sites) {
    let protein = this;

    // Make an NGL selection string for the selected sites
    let selectedSitesStrings = [];
    sites.forEach((d) => {
      const site = d.site_protein;
      const chains = d.site_chain.split(" ");
      // If the site isn't a number, it's not in the protein structure
      if (isNaN(parseInt(site))) {
        return;
      } else {
        const siteStrings = chains
          .map((chain) => protein.#makeSiteString(site, chain))
          .join(" or ");
        selectedSitesStrings.push(siteStrings);
      }
    });
    protein.currentSelectionSiteString = selectedSitesStrings.length
      ? selectedSitesStrings.join(" or ")
      : undefined;

    // Create a representation of the selected sites on the protein structure
    if (protein.currentSelectionSiteString !== undefined) {
      protein.stage.getRepresentationsByName("currentSelection").dispose();
      return protein.component
        .addRepresentation(protein.config.selectionRepresentation, {
          color: protein.schemeId,
          opacity: protein.config.selectionOpacity,
          roughness: 1,
          name: "currentSelection",
          surfaceType: "av",
          side: "front",
          useWorker: true,
        })
        .setSelection(protein.currentSelectionSiteString);
    } else {
      protein.stage.getRepresentationsByName("currentSelection").dispose();
    }
  }
  /**
   * Reize the protein structure
   */
  resize(chartHeight) {
    let protein = this;

    // Calculate the height of the protein, which is 1.5 times the height of the chart
    const proteinHeight = chartHeight * 1.5;

    // Set the height of the protein element
    document.querySelector(".protein").style.height = `${proteinHeight}px`;

    // Handle the resize event for the protein structure
    protein.stage.handleResize();
  }
  /**
   * Clear the protein structure and reload it
   */
  clear() {
    let protein = this;
    // Clear the protein structure
    protein.stage.removeAllComponents();
  }
  /**
   * Save an image of the protein structure
   */
  saveImage() {
    let protein = this;

    protein.stage
      .makeImage({
        factor: 4,
        antialias: true,
        trim: false,
        transparent: false,
      })
      // Make a specific filename for the image
      .then(function (blob) {
        let now = new Date();
        let dateString =
          now.getFullYear().toString() +
          "-" +
          (now.getMonth() + 1).toString().padStart(2, "0") +
          "-" +
          now.getDate().toString().padStart(2, "0");
        let fileName = `${protein.config.dataset}_${protein.config.proteinCondition}_${dateString}.png`;
        NGL.download(blob, fileName);
      });
  }
  /**
   * Convert the three letter code to a one letter code
   * @param {String}
   */
  #getOneLetterCode(threeLetterCode) {
    const aminoAcidMap = {
      ALA: "A",
      ARG: "R",
      ASN: "N",
      ASP: "D",
      CYS: "C",
      GLU: "E",
      GLN: "Q",
      GLY: "G",
      HIS: "H",
      ILE: "I",
      LEU: "L",
      LYS: "K",
      MET: "M",
      PHE: "F",
      PRO: "P",
      SER: "S",
      THR: "T",
      TRP: "W",
      TYR: "Y",
      VAL: "V",
      SEC: "U",
      PYL: "O",
    };
    const oneLetterCode = aminoAcidMap[threeLetterCode.toUpperCase()];
    return oneLetterCode ? ` (${oneLetterCode})` : "";
  }
  /**
   * Format site string for selection
   * @param {Int16Array}
   * @param {String}
   */
  #makeSiteString(site, chain) {
    return `${chain != "polymer" ? ":" : ""}${chain} and ${site} and protein`;
  }
}
