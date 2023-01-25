// Instruction Modal UI
const modal = document.querySelector(".modal"),
  trigger = document.querySelector(".trigger"),
  closeButton = document.querySelector(".close-button");

function toggleModal() {
  modal.classList.toggle("show-modal");
}

function windowOnClick(event) {
  if (event.target === modal) {
    toggleModal();
  }
}

trigger.addEventListener("click", toggleModal);
closeButton.addEventListener("click", toggleModal);
window.addEventListener("click", windowOnClick);

// Sibebar Accordian UI
const accordionBtns = document.querySelectorAll(".accordion"),
  sidebar = document.getElementById("sidebar"),
  toggle = document.getElementById("sidebar-toggle"),
  headerpd = document.getElementById("header"),
  mainpd = document.getElementById("main");

accordionBtns.forEach((accordion) => {
  accordion.onclick = function () {
    // Check if the sidebar has a class of closed
    if (sidebar.classList.contains("sidebar--collapsed")) {
      // change sidebar state
      sidebar.classList.toggle("sidebar--collapsed");
      // change icon state
      toggle.classList.toggle("bx-x");
      // change header padding state
      headerpd.classList.toggle("body-pad");
      // change main padding state
      mainpd.classList.toggle("body-pad");
      // trigger resize event
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        this.classList.toggle("is-open");
        let content = this.nextElementSibling;

        if (content.style.maxHeight) {
          //this is if the accordion is open
          content.style.maxHeight = null;
        } else {
          //if the accordion is currently closed
          content.style.maxHeight = content.scrollHeight + "px";
        }
      }, 500);
    } else {
      this.classList.toggle("is-open");
      let content = this.nextElementSibling;

      if (content.style.maxHeight) {
        //this is if the accordion is open
        content.style.maxHeight = null;
      } else {
        //if the accordion is currently closed
        content.style.maxHeight = content.scrollHeight + "px";
      }
    }
  };
});

// Sidebar Collapse UI
const hideNavbar = (toggleId, navId) => {
  const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId),
    headerpd = document.getElementById("header"),
    mainpd = document.getElementById("main");

  // Validate that all variables exist
  if (toggle && nav && headerpd && mainpd) {
    toggle.addEventListener("click", () => {
      // show navbar
      nav.classList.toggle("sidebar--collapsed");
      // change icon
      toggle.classList.toggle("bx-x");
      // add padding to header
      headerpd.classList.toggle("body-pad");
      // add padding to main
      mainpd.classList.toggle("body-pad");

      // Trigger the resize event
      // Set a timeout to make sure the event is triggered after the animation
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 500);

      // Finally, close the accoridon menu
      const accordions = document.querySelectorAll(".accordion");
      accordions.forEach((accordion) => {
        accordion.classList.remove("is-open");
        let content = accordion.nextElementSibling;
        content.style.maxHeight = null;
      });
    });
  }
};

hideNavbar("sidebar-toggle", "sidebar");
