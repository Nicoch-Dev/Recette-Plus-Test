const resetForm =
    document.getElementById("resetForm");

const resetEmail =
    document.getElementById("resetEmail");

const resetButton =
    document.getElementById("resetButton");

const resetMessage =
    document.getElementById("resetMessage");


// ==========================================
// ENVOI DU LIEN DE RÉINITIALISATION
// ==========================================

resetForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            resetEmail
                .value
                .trim();


        if (email === "") {

            resetMessage.textContent =
                "Veuillez renseigner votre adresse e-mail.";

            resetMessage.className =
                "auth-message error";

            return;
        }


        resetButton.disabled = true;

        resetButton.textContent =
            "Envoi en cours...";

        resetMessage.textContent = "";


        const {
            error
        } =
            await supabaseClient
                .auth
                .resetPasswordForEmail(
                    email,
                    {
                        redirectTo:

                            "http://localhost:5500/RecettePlus/html/nouveau-mot-de-passe.html"
                    }
                );


        if (error) {

            console.error(
                "Erreur réinitialisation :",
                error
            );


            resetMessage.textContent =
                "Impossible d'envoyer l'e-mail de réinitialisation.";

            resetMessage.className =
                "auth-message error";


            resetButton.disabled = false;

            resetButton.textContent =
                "Envoyer le lien de réinitialisation";

            return;
        }


        resetMessage.textContent =
            "Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.";

        resetMessage.className =
            "auth-message success";


        resetButton.disabled = false;

        resetButton.textContent =
            "Renvoyer le lien";

    }
);