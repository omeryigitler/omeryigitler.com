(() => {
  const logo = document.querySelector(".logo-container");
  if (logo) {
    let clicks = 0;
    let timer = 0;
    logo.addEventListener("click", (event) => {
      clicks += 1;
      if (clicks === 3) {
        event.preventDefault();
        if (window.taurus_set_internal) window.taurus_set_internal();
        window.location.href = "gateway.html";
        clicks = 0;
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { clicks = 0; }, 600);
    });
  }

})();
