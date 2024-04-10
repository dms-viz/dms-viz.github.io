import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

export class UI {
  constructor() {
    /* Main UI elements */
    this.sidebar = document.getElementById("app-sidebar");
    this.navbar = document.getElementById("app-navbar");
    this.main = document.getElementById("app-main");

    /* Elements responsible for toggling the sidebar */
    this.toggle = document.getElementById("sidebar-toggle");

    /* Elements responsible for toggling the download buttons */
    this.localFile = document.getElementById("local-file");
    this.remoteFile = document.getElementById("remote-file");

    /* Button to show dataset information */
    this.infoButton = document.getElementById("dataset-info-button");

    /* Register event listeners */
    this.registerEventListeners();
    this.registerTooltips();
  }

  /* Method to toggle sidebar classes */
  toggleSidebar() {
    let ui = this;
    // Add the collapsed class to each of the main elements
    ui.sidebar.classList.toggle("sidebar-collapsed");
    ui.navbar.classList.toggle("sidebar-collapsed");
    ui.main.classList.toggle("sidebar-collapsed");
    // Select all of the accordion buttons
    const accordions = document.querySelectorAll(".accordion");
    // Check if the sidebar is collapsed
    if (ui.sidebar.classList.contains("sidebar-collapsed")) {
      // Close all of the sub menus
      accordions.forEach((accordion) => {
        accordion.classList.remove("is-open");
        let content = accordion.nextElementSibling;
        content.style.maxHeight = null;
      });
      // Change the icon and text of the toggle button
      document.querySelector("#sidebar-toggle i").className =
        "bx bx-horizontal-right";
      document.querySelector("#sidebar-toggle span").textContent =
        "Expand Sidebar";
    } else {
      // Change the icon and text of the toggle button
      document.querySelector("#sidebar-toggle i").className =
        "bx bx-horizontal-left";
      document.querySelector("#sidebar-toggle span").textContent =
        "Collapse Sidebar";
    }
    // Finally, dispatch a resize event to trigger plot resizing
    window.dispatchEvent(new Event("resize"));
  }

  /* Method to open/close the sidebar accordion menus */
  toggleAccordion(btn) {
    let ui = this;
    // Toggle the class of the accordion button
    btn.classList.toggle("is-open");
    // Open the side if it is closed
    if (ui.sidebar.classList.contains("sidebar-collapsed")) {
      ui.toggleSidebar();
    }
    // Open the accordion content if it is closed
    let content = btn.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  }

  /* Method to toggle download buttons between local and remote */
  toggleDownload({ target: element }) {
    const accordianButton =
      element.parentNode.parentNode.parentNode.previousElementSibling;
    const accordianContent = element.parentNode.parentNode.parentNode;
    const buttons = Array.from(element.parentNode.querySelectorAll("button"));
    buttons.forEach((button) => button.classList.remove("upload-method"));

    element.classList.add("upload-method");

    // Hide/show corresponding divs
    if (element.id === "local-file") {
      document.getElementById("local-file-input").style.display = "block";
      document.getElementById("remote-url-input").style.display = "none";
      document.getElementById("remote-markdown-input").style.display = "none";
      // If the accordion button has the class 'is-open', then the accordion is open
      if (accordianButton.classList.contains("is-open")) {
        accordianContent.style.maxHeight = accordianContent.scrollHeight + "px";
      }
    } else if (element.id === "remote-file") {
      document.getElementById("remote-url-input").style.display = "block";
      document.getElementById("remote-markdown-input").style.display = "block";
      document.getElementById("local-file-input").style.display = "none";
      // If the accordion button has the class 'is-open', then the accordion is open
      if (accordianButton.classList.contains("is-open")) {
        accordianContent.style.maxHeight = accordianContent.scrollHeight + "px";
      }
    }
  }

  /* Method show the dataset description alert */
  showDatasetDescription() {
    const ui = this;
    // Show the alert banner with a dataset description
    const alert = new Alerts();
    alert.showAlert(ui.datasetDescription, "info");
  }

  /* Register the event listeners */
  registerEventListeners() {
    // Toggle the sidebar when the toggle button is clicked
    this.toggle.addEventListener("click", () => this.toggleSidebar());
    // Toggle the accordion menus when clicked
    this.sidebar.addEventListener("click", (event) => {
      const accordion = event.target.closest(".accordion");
      if (accordion) {
        this.toggleAccordion(accordion);
      }
    });
    // Toggle the download buttons when clicked
    this.localFile.addEventListener("click", (event) =>
      this.toggleDownload(event)
    );
    this.remoteFile.addEventListener("click", (event) =>
      this.toggleDownload(event)
    );
    // Show the dataset description alert when clicked
    this.infoButton.addEventListener("click", () =>
      this.showDatasetDescription()
    );
    // Toggle the sidebar if the window is too small
    window.addEventListener("load", () => {
      const mediaQuery = window.matchMedia("(max-width: 1200px)");
      if (mediaQuery.matches) {
        this.toggleSidebar();
      } else {
        window.dispatchEvent(new Event("resize"));
        const chartBtn = document.getElementById("chart-btn");
        this.toggleAccordion(chartBtn);
      }
    });
  }

  /* Register the information tooltips from tippy */
  registerTooltips() {
    // Dataset description tooltip
    tippy(".bx-info-circle", {
      content: "Click here for more information about the dataset",
      placement: "right",
      theme: "select-info",
      animation: "scale",
    });
  }
}

// Class for to handle alert messages
export class Alerts {
  constructor() {
    this.alertBanner = document.getElementById("alertBanner");
    this.alertMessage = document.getElementById("alertMessage");
    this.alertClose = document.getElementById("alertClose");
    this.registerEventListeners();
  }

  // Function to show the alert banner with a specific message and color
  showAlert(message, type = "error") {
    this.alertMessage.innerHTML = message;
    this.alertBanner.classList.remove("error", "info", "warning", "instruct");
    this.alertBanner.classList.remove("hidden");
    this.alertBanner.classList.add(type);
  }

  // Function to hide the alert banner
  hideAlert() {
    this.alertBanner.classList.add("hidden");
  }

  // Function to register event listeners
  registerEventListeners() {
    this.alertClose.addEventListener("click", () => this.hideAlert());
  }
}
