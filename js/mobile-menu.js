const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const mobileNavigation =
    document.querySelector(".navigation");


if (
    mobileMenuButton &&
    mobileNavigation
) {

    mobileMenuButton.addEventListener(
        "click",
        function () {

            const isOpen =
                mobileNavigation.classList.toggle(
                    "mobile-open"
                );


            mobileMenuButton.classList.toggle(
                "is-open",
                isOpen
            );


            mobileMenuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );


            mobileMenuButton.setAttribute(
                "aria-label",
                isOpen
                    ? "Fermer le menu"
                    : "Ouvrir le menu"
            );

        }
    );


    // ==========================================
    // FERMER APRÈS CLIC SUR UN LIEN
    // ==========================================

    mobileNavigation
        .querySelectorAll("a")
        .forEach(function (link) {

            link.addEventListener(
                "click",
                function () {

                    mobileNavigation.classList.remove(
                        "mobile-open"
                    );

                    mobileMenuButton.classList.remove(
                        "is-open"
                    );

                    mobileMenuButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

        });

}