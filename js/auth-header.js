async function updateAuthHeader() {

    const loginButton =
        document.getElementById("loginButton");

    const accountButton =
        document.getElementById("accountButton");

    const userName =
        document.getElementById("userName");


    if (!loginButton) {
        return;
    }


    const {
        data: {
            user
        },
        error
    } =
        await supabaseClient
            .auth
            .getUser();


    if (error) {

        console.error(
            "Erreur utilisateur :",
            error
        );

    }


    // ==========================================
    // NON CONNECTÉ
    // ==========================================

    if (!user) {

        if (accountButton) {

            accountButton.style.display =
                "none";

        }


        loginButton.style.display =
            "inline-flex";


        loginButton.textContent =
            "Se connecter";


        loginButton.href =
            getLoginPath();


        return;

    }


    // ==========================================
    // CONNECTÉ
    // ==========================================

    const firstName =
        user.user_metadata?.first_name ||
        user.email?.split("@")[0] ||
        "Utilisateur";


    if (accountButton) {

        accountButton.style.display =
            "inline-flex";

        accountButton.href =
            getAccountPath();

    }


    if (userName) {

        userName.textContent =
            `Bonjour ${firstName}`;

    }


    loginButton.style.display =
        "inline-flex";


    loginButton.textContent =
        "Se déconnecter";


    loginButton.href =
        "#";


    loginButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();


            if (error) {

                console.error(
                    "Erreur déconnexion :",
                    error
                );

                return;

            }


            window.location.href =
                getHomePath();

        }
    );

}


// ==========================================
// CHEMINS
// ==========================================

function isHtmlFolder() {

    return window.location.pathname
        .includes("/html/");

}


function getLoginPath() {

    return isHtmlFolder()
        ? "./connexion.html"
        : "./html/connexion.html";

}


function getAccountPath() {

    return isHtmlFolder()
        ? "./mon-compte.html"
        : "./html/mon-compte.html";

}


function getHomePath() {

    return isHtmlFolder()
        ? "../index.html"
        : "./index.html";

}


// ==========================================
// LANCEMENT
// ==========================================

updateAuthHeader();