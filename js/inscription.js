// ==========================================
// INVITATION ÉVENTUELLE
// ==========================================

const invitationToken =
    new URLSearchParams(
        window.location.search
    ).get("invitation");

const signupForm =
    document.getElementById("signupForm");

const signupMessage =
    document.getElementById("signupMessage");

const signupButton =
    document.getElementById("signupButton");


// ==========================================
// INSCRIPTION
// ==========================================

signupForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            document
                .getElementById("signupName")
                .value
                .trim();


        const email =
            document
                .getElementById("signupEmail")
                .value
                .trim();


        const password =
            document
                .getElementById("signupPassword")
                .value;


        const passwordConfirm =
            document
                .getElementById("signupPasswordConfirm")
                .value;


        // ======================================
        // VÉRIFICATION MOT DE PASSE
        // ======================================

        if (password !== passwordConfirm) {

            signupMessage.textContent =
                "Les mots de passe ne correspondent pas.";

            signupMessage.className =
                "auth-message error";

            return;

        }


        // ======================================
        // CHARGEMENT
        // ======================================

        signupButton.disabled = true;

        signupButton.textContent =
            "Création du compte...";


        signupMessage.textContent = "";


        // ======================================
        // SUPABASE AUTH
        // ======================================

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .signUp({

                    email: email,

                    password: password,

                    options: {

                        data: {

                            first_name: name,

                            ...(invitationToken
                                ? {
                                    invitation_token:
                                        invitationToken
                                }
                                : {})

                        }

                    }

                });


        // ======================================
        // ERREUR
        // ======================================

        if (error) {

            console.error(
                "Erreur inscription :",
                error
            );


            signupMessage.textContent =
                "Erreur : " + error.message;


            signupMessage.className =
                "auth-message error";


            signupButton.disabled = false;

            signupButton.textContent =
                "Créer mon compte";


            return;

        }


        // ======================================
        // SUCCÈS
        // ======================================

        console.log(
            "Utilisateur créé :",
            data
        );


        signupMessage.textContent =
            "Compte créé avec succès !";


        signupMessage.className =
            "auth-message success";


        signupButton.textContent =
            "Compte créé ✓";


        // ======================================
        // VÉRIFIER SI L'UTILISATEUR EST CONNECTÉ
        // ======================================

        if (data.session) {

        // ======================================
        // ACCEPTER L'INVITATION
        // ======================================

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

                }

            } catch (invitationError) {

                console.error(
                    "Erreur invitation :",
                    invitationError
                );

            }

        }


        setTimeout(
            function () {

                window.location.href =
                    "../index.html";

            },
            1000
        );

    } else {

            signupMessage.textContent =
                "Compte créé. Vérifiez votre e-mail pour confirmer votre inscription.";


            signupButton.disabled = false;

            signupButton.textContent =
                "Créer mon compte";

        }

    }
);