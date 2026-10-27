
    /* Logo: single tap = scroll to top, triple tap = admin gateway */
    (function () {
        const logo = document.querySelector(".logo-container");
        if (!logo) return;

        let clicks = 0;
        let resetTimer;

        logo.addEventListener("click", (e) => {
            e.preventDefault();
            clicks += 1;

            if (clicks === 1) {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }

            if (clicks === 3) {
                if (window.taurus_set_internal) window.taurus_set_internal();
                window.location.href = "gateway.html";
                clicks = 0;
                return;
            }

            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => { clicks = 0; }, 600);
        });
    })();
