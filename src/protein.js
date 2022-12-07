import * as NGL from "ngl";

export class Protein {
  /**
   * Class constructor with initial configuration
   * @param {String}
   */
  constructor(elementID) {
    this.stage = new NGL.Stage(elementID, { backgroundColor: "white" });
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
        color: "lightgrey",
        opacity: 0.75,
        smoothSheet: true,
        roughness: 1,
      });
      // Set the rotation of the structure
      comp.setRotation([2, 0, 0]);
      // Set the zoom of the structure
      protein.stage.autoView();
      // Turn off the spinning animation
      protein.stage.setSpin(false);
      // Center and zoom the visualization to fit the protein structure
      comp.autoView();
    });
  }
}
