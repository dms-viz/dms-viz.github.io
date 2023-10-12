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
      protein.dataChainSelection = `protein and (:${dataChains.join(" or :")})`;
      protein.backgroundChainSelection = `protein and (not :${dataChains.join(
        " and not :"
      )})`;
      if (excludeChains != "none") {
        protein.backgroundChainSelection += ` and (not :${excludeChains.join(
          " and not :"
        )})`;
      }
    } else {
      protein.dataChainSelection = "protein";
      protein.backgroundChainSelection = "none";
    }

    // Load the protein structure
    protein.stage
      .loadFile(protein.structure, protein.loadConfig)
      .then(function (component) {
        // Save the loaded protein structure
        protein.component = component;
        // Identify the non-carbon hydrogen atoms
        protein.nonCarbonHydrogens = [];
        protein.component.structure.eachAtom(function (atom) {
          if (atom.element == "H") {
            let bondedAtoms = [];
            atom.eachBondedAtom(function (bondedAtom) {
              bondedAtoms.push(bondedAtom.element);
            });
            // Check if bondedAtoms contains any element other than "C"
            if (bondedAtoms.some((e) => e !== "C")) {
              protein.nonCarbonHydrogens.push(atom.index);
            }
          }
        });
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
      sele: protein.config.showNonCarbonHydrogens
        ? `(${protein.dataChainSelection} and not hydrogen)` +
          protein.#makeNonCarbonHydrogenSelection(protein.dataChainSelection)
        : `(${protein.dataChainSelection} and not hydrogen)`,
      color: protein.config.proteinElement
        ? "element"
        : protein.config.proteinColor,
      opacity: protein.config.proteinOpacity,
      name: "dataChains",
      smoothSheet: true,
      side: "front",
      surfaceType: "av",
    });
    protein.stage.getRepresentationsByName("backgroundChains").dispose();
    if (protein.backgroundChainSelection != "none") {
      protein.component.addRepresentation(
        protein.config.backgroundRepresentation,
        {
          sele: protein.config.showNonCarbonHydrogens
            ? `(${protein.backgroundChainSelection} and not hydrogen)` +
              protein.#makeNonCarbonHydrogenSelection(
                protein.backgroundChainSelection
              )
            : `(${protein.backgroundChainSelection} and not hydrogen)`,
          color: protein.config.backgroundColor,
          opacity: protein.config.backgroundOpacity,
          name: "backgroundChains",
          smoothSheet: true,
          side: "front",
          surfaceType: "av",
        }
      );
    }
    protein.stage.getRepresentationsByName("ligands").dispose();
    if (protein.config.showGlycans) {
      protein.component.addRepresentation(protein.config.ligandRepresentation, {
        sele: "ligand and not protein",
        color: protein.config.ligandElement
          ? "element"
          : protein.config.ligandColor,
        name: "ligands",
        multipleBond: "symmetric",
        radiusScale:
          protein.config.ligandRepresentation == "ball+stick" ? 1.5 : 1,
      });
    }
    protein.stage.getRepresentationsByName("nucleotide_cartoon").dispose();
    protein.stage.getRepresentationsByName("nucleotide_bases").dispose();
    if (protein.config.showNucleotides) {
      protein.component.addRepresentation("cartoon", {
        sele: "(nucleic or rna or dna)",
        color: "resname",
        name: "nucleotide_cartoon",
      });
      protein.component.addRepresentation("base", {
        sele: "(nucleic or rna or dna)",
        color: "resname",
        name: "nucleotide_bases",
      });
    }
    if (protein.currentSelectionSiteString !== undefined) {
      protein.stage.getRepresentationsByName("currentSelection").setParameters({
        opacity: protein.config.selectionOpacity,
      });
      protein.stage
        .getRepresentationsByName("currentSelection")
        .setSelection(
          protein.config.showNonCarbonHydrogens
            ? `(${protein.currentSelectionSiteString} and not hydrogen)` +
                protein.#makeNonCarbonHydrogenSelection(
                  protein.currentSelectionSiteString
                )
            : `(${protein.currentSelectionSiteString} and not hydrogen)`
        );
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

    // Get the data for the selected dataset
    protein.originalMutMetric =
      protein.data[protein.config.dataset].mut_metric_df;

    // Mask the data based on the filters
    protein.mutMetric = protein.originalMutMetric.map((d) => {
      let newRow = { ...d }; // make a copy of the original object
      // Loop through each filter in chart.config.filters
      for (let filterKey in protein.config.filters) {
        let filterValue = protein.config.filters[filterKey];
        // Set the value of metric to null if the row doesn't pass the filter
        if (newRow[filterKey] < filterValue) {
          newRow.metric = null;
          break;
        }
      }
      return newRow;
    });

    // Get the excluded amino acids for the dataset
    protein.excludedAminoAcids =
      protein.data[protein.config.dataset].excludedAminoAcids;

    // Summarize and filter the datasets based on the selections and conditions
    protein.mutMetricSummary = summarizeMetricData(
      protein.mutMetric,
      protein.excludedAminoAcids
    )
      .filter((e) => e.condition === protein.config.proteinCondition)
      .filter((e) => e[protein.config.summary] !== null);

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
    // If negative colors are defined, use them
    let negativeColor;
    if (protein.data[protein.config.dataset].negative_condition_colors) {
      negativeColor =
        protein.data[protein.config.dataset].negative_condition_colors[
          protein.config.proteinCondition
        ];
    } else {
      negativeColor = invertColor(positiveColor);
    }
    const metricExtent = d3
      .extent(protein.mutMetricSummary, protein.colorAccessor)
      .map(Math.abs);
    if (metricExtent[0] === 0 && metricExtent[1] === 0) {
      protein.colorScale = d3
        .scaleLinear()
        .domain([0, 0])
        .range(["white", "white"]);
    } else {
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
      ? `protein and (${selectedSitesStrings.join(" or ")})`
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
        .setSelection(
          protein.config.showNonCarbonHydrogens
            ? `(${protein.currentSelectionSiteString} and not hydrogen)` +
                protein.#makeNonCarbonHydrogenSelection(
                  protein.currentSelectionSiteString
                )
            : `(${protein.currentSelectionSiteString} and not hydrogen)`
        );
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
    return `(${chain != "polymer" ? ":" : ""}${chain} and ${site})`;
  }
  /**
   * Format the selection string for non-carbon hydrogen atoms
   * @param {String}
   */
  #makeNonCarbonHydrogenSelection(selection) {
    let protein = this;

    if (protein.nonCarbonHydrogens.length) {
      return ` or (@${protein.nonCarbonHydrogens.join(
        ","
      )} and (${selection}))`;
    } else {
      return "";
    }
  }
}
