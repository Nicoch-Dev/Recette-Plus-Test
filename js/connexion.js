const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const loginButton =
    document.getElementById("loginButton");


// ==========================================
// CONNEXION
// ==========================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            document
                .getElementById("loginEmail")
                .value
                .trim();


        const password =
            document
                .getElementById("loginPassword")
                .value;


        loginButton.disabled = true;

        loginButton.textContent =
            "Connexion...";

        loginMessage.textContent = "";


        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .signInWithPassword({

                    email: email,

                    password: password

                });


        if (error) {

            console.error(
                "Erreur connexion :",
                error
            );


            loginMessage.textContent =
                "E-mail ou mot de passe incorrect.";


            loginMessage.className =
                "auth-message error";


            loginButton.disabled = false;

            loginButton.textContent =
                "Se connecter";


            return;
        }


        console.log(
            "Utilisateur connecté :",
            data.user
        );

        // ==========================================
        // ACCEPTER UNE INVITATION EN ATTENTE
        // ==========================================

        const invitationToken =
            new URLSearchParams(
                window.location.search
            ).get("invitation")
            ||
            data.user
                ?.user_metadata
                ?.invitation_token;


        if (invitationToken) {

            try {

                const {
                    data: invitationResult,
                    error: invitationError
                } =
                    await supabaseClient
                        .functions
                        .invoke(
                            "accept-invitation",
                            {
                                body: {
                                    token:
                                        invitationToken
                                }
                            }
                        );


                if (invitationError) {

                    console.error(
                        "Erreur acceptation invitation :",
                        invitationError
                    );

                } else {

                    console.log(
                        "Invitation acceptée :",
                        invitationResult
                    );


                    // ==================================
                    // SUPPRIMER LE TOKEN UNE FOIS UTILISÉ
                    // ==================================

                    const {
                        error: metadataError
                    } =
                        await supabaseClient
                            .auth
                            .updateUser({
                                data: {
                                    invitation_token:
                                        null
                                }
                            });


                    if (metadataError) {

                        console.error(
                            "Erreur suppression token invitation :",
                            metadataError
                        );

                    }

                }

            } catch (invitationError) {

                console.error(
                    "Erreur invitation :",
                    invitationError
                );

            }

        }


        loginMessage.textContent =
            "Connexion réussie !";


        loginMessage.className =
            "auth-message success";


        loginButton.textContent =
            "Connecté ✓";


        setTimeout(
            function () {

                const params =
                    new URLSearchParams(
                        window.location.search
                    );

                const redirect =
                    params.get("redirect");


                // ======================================
                // RETOUR À LA PAGE DEMANDÉE
                // ======================================

                if (redirect) {

                    /*
                        Sécurité :
                        on autorise uniquement un nom
                        de fichier HTML local.
                    */

                    const safePage =
                        /^[a-zA-Z0-9_-]+\.html$/
                            .test(redirect);


                    if (safePage) {

                        window.location.href =
                            `./${redirect}`;

                        return;
                    }

                }


                // ======================================
                // CONNEXION NORMALE
                // ======================================

                window.location.href =
                    "../index.html";

            },
            700
        );

    }
);