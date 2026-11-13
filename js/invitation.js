// ==========================================
// ÉLÉMENTS DE LA PAGE
// ==========================================

const invitationTitle =
    document.getElementById(
        "invitationTitle"
    );

const invitationText =
    document.getElementById(
        "invitationText"
    );

const invitationLoading =
    document.getElementById(
        "invitationLoading"
    );

const invitationActions =
    document.getElementById(
        "invitationActions"
    );

const invitationError =
    document.getElementById(
        "invitationError"
    );


// ==========================================
// AFFICHER UNE ERREUR
// ==========================================

function showInvitationError(message) {

    if (invitationLoading) {
        invitationLoading.hidden = true;
    }

    if (invitationActions) {
        invitationActions.hidden = true;
    }

    if (invitationError) {

        invitationError.textContent =
            message;

        invitationError.hidden =
            false;

    }

}




// ==========================================
// VÉRIFIER L'INVITATION
// ==========================================

async function loadInvitation() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const token =
        params.get("token");


    // Aucun token dans l'URL

    if (!token) {

        showInvitationError(
            "Ce lien d'invitation n'est pas valide."
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .functions
                .invoke(
                    "validate-invitation",
                    {
                        body: {
                            token: token
                        }
                    }
                );


        if (
            error ||
            !data ||
            !data.valid
        ) {

            console.error(
                "Invitation invalide :",
                error,
                data
            );

            showInvitationError(
                data?.error ||
                "Cette invitation n'est plus valide."
            );

            return;
        }


        // ==================================
        // INVITATION VALIDE
        // ==================================

        const firstName =
            data.inviter?.firstName ||
            "Un proche";


        if (invitationTitle) {

            invitationTitle.textContent =
                `${firstName} vous invite à rejoindre Recette Plus`;

        }


        if (invitationText) {

            invitationText.textContent =
                "Rejoignez Recette Plus pour partager vos recettes, vos idées et cuisiner ensemble.";

        }


        if (invitationLoading) {

            invitationLoading.hidden =
                true;

        }


        if (invitationError) {

            invitationError.hidden =
                true;

        }


        if (invitationActions) {

            invitationActions.hidden =
                false;

        }


    } catch (error) {

        console.error(
            "Erreur vérification invitation :",
            error
        );

        showInvitationError(
            "Impossible de vérifier cette invitation."
        );

    }

}

// ==========================================
// REJOINDRE RECETTE PLUS
// ==========================================

const joinRecettePlusButton =
    document.getElementById(
        "joinRecettePlusButton"
    );


if (joinRecettePlusButton) {

    joinRecettePlusButton.addEventListener(
        "click",
        function () {

            const params =
                new URLSearchParams(
                    window.location.search
                );

            const token =
                params.get("token");


            if (!token) {

                showInvitationError(
                    "Ce lien d'invitation n'est pas valide."
                );

                return;
            }


            const signupUrl =
                new URL(
                    "./inscription.html",
                    window.location.href
                );


            signupUrl.searchParams.set(
                "invitation",
                token
            );


            window.location.href =
                signupUrl.toString();

        }
    );

}


// ==========================================
// LANCEMENT
// ==========================================

// ==========================================
// J'AI DÉJÀ UN COMPTE
// ==========================================

const existingAccountButton =
    document.getElementById(
        "existingAccountButton"
    );


if (existingAccountButton) {

    existingAccountButton.addEventListener(
        "click",
        function () {

            const params =
                new URLSearchParams(
                    window.location.search
                );

            const token =
                params.get("token");


            if (!token) {

                showInvitationError(
                    "Ce lien d'invitation n'est pas valide."
                );

                return;
            }


            const loginUrl =
                new URL(
                    "./connexion.html",
                    window.location.href
                );


            loginUrl.searchParams.set(
                "invitation",
                token
            );


            window.location.href =
                loginUrl.toString();

        }
    );

}

loadInvitation();