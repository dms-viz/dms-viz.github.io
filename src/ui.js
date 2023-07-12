import { once } from "lodash";

export class UI {
  constructor() {
    // UI Elements
    this.modal = document.querySelector(".modal");
    this.trigger = document.querySelector(".trigger");
    this.closeButton = document.querySelector(".close-button");
    this.sidebar = document.getElementById("sidebar");
    this.toggle = document.getElementById("sidebar-toggle");
    this.headerpd = document.getElementById("header");
    this.mainpd = document.getElementById("main");
    this.localFile = document.getElementById("local-file");
    this.remoteFile = document.getElementById("remote-file");
    this.accordionParent = document.getElementById("sidebar");
    this.highlightHelp = once(this.highlightHelp.bind(this));
    this.registerEventListeners();
  }

  // UI functions to attach to event listeners
  toggleModal() {
    this.modal.classList.toggle("show-modal");
  }

  windowOnClick(event) {
    if (event.target === this.modal) {
      this.toggleModal();
    }
  }

  toggleSidebar() {
    return new Promise((resolve) => {
      this.sidebar.classList.toggle("sidebar--collapsed");
      this.toggle.classList.toggle("bx-x");
      this.headerpd.classList.toggle("body-pad");
      this.mainpd.classList.toggle("body-pad");

      this.sidebar.addEventListener("transitionend", resolve, { once: true });
    });
  }

  toggleAccordion(btn) {
    if (this.sidebar.classList.contains("sidebar--collapsed")) {
      this.toggleSidebar().then(() => {
        this.expandAccordionContent(btn);
      });
    } else {
      this.expandAccordionContent(btn);
    }
  }

  expandAccordionContent(btn) {
    btn.classList.toggle("is-open");
    let content = btn.nextElementSibling;

    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  }

  registerEventListeners() {
    this.trigger.addEventListener("click", () => this.toggleModal());
    this.closeButton.addEventListener("click", () => this.toggleModal());
    window.addEventListener("click", (event) => this.windowOnClick(event));
    this.toggle.addEventListener("click", () => this.handleSidebarToggle());
    this.localFile.addEventListener("click", (event) =>
      this.toggleDownload(event)
    );
    this.remoteFile.addEventListener("click", (event) =>
      this.toggleDownload(event)
    );
    this.accordionParent.addEventListener("click", (event) => {
      const accordion = event.target.closest(".accordion");
      if (accordion) {
        this.toggleAccordion(accordion);
      }
    });

    // Shrink the sidebar on load if the screen is less than 1000px
    window.addEventListener("load", () => {
      const mediaQuery = window.matchMedia("(max-width: 1000px)");
      if (mediaQuery.matches) {
        this.toggleSidebar();
      } else {
        window.dispatchEvent(new Event("resize"));
      }
    });

    document.addEventListener("mousedown", () => this.highlightHelp());
  }

  highlightHelp() {
    const message = document.getElementById("help-message");
    const help = document.querySelector(".help");
    this.trigger.classList.remove("glow");
    help.classList.remove("active");
    message.remove();
  }

  toggleDownload({ target: element }) {
    const buttons = Array.from(element.parentNode.querySelectorAll("button"));
    buttons.forEach((button) => button.classList.remove("upload-method"));

    element.classList.add("upload-method");

    // Hide/show corresponding divs
    if (element.id === "local-file") {
      document.getElementById("local-file-input").style.display = "block";
      document.getElementById("remote-url-input").style.display = "none";
    } else if (element.id === "remote-file") {
      document.getElementById("remote-url-input").style.display = "block";
      document.getElementById("local-file-input").style.display = "none";
    }
  }

  handleSidebarToggle() {
    this.toggleSidebar().then(() => {
      window.dispatchEvent(new Event("resize"));
      const accordions = document.querySelectorAll(".accordion");
      accordions.forEach((accordion) => {
        accordion.classList.remove("is-open");
        let content = accordion.nextElementSibling;
        content.style.maxHeight = null;
      });
    });
  }
}
