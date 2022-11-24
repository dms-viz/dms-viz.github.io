import * as NGL from "ngl";

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
