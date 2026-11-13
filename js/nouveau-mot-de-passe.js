const newPasswordForm =
    document.getElementById("newPasswordForm");

const newPasswordButton =
    document.getElementById("newPasswordButton");

const newPasswordMessage =
    document.getElementById("newPasswordMessage");


// ==========================================
// ENREGISTREMENT DU NOUVEAU MOT DE PASSE
// ==========================================

newPasswordForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const password =
            document
                .getElementById("newPassword")
                .value;


        const confirmPassword =
            document
                .getElementById("confirmNewPassword")
                .value;


        // ======================================
        // VÉRIFICATION
        // ======================================

        if (password !== confirmPassword) {

            newPasswordMessage.textContent =
                "Les mots de passe ne correspondent pas.";

            newPasswordMessage.className =
                "auth-message error";

            return;
        }


        if (password.length < 6) {

            newPasswordMessage.textContent =
                "Le mot de passe doit contenir au moins 6 caractères.";

            newPasswordMessage.className =
                "auth-message error";

            return;
        }


        // ======================================
        // CHARGEMENT
        // ======================================

        newPasswordButton.disabled = true;

        newPasswordButton.textContent =
            "Enregistrement...";

        newPasswordMessage.textContent = "";


        // ======================================
        // MISE À JOUR SUPABASE
        // ======================================

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .updateUser({

                    password: password

                });


        // ======================================
        // ERREUR
        // ======================================

        if (error) {

            console.error(
                "Erreur mot de passe :",
                error
            );


            newPasswordMessage.textContent =
                "Impossible de modifier le mot de passe.";

            newPasswordMessage.className =
                "auth-message error";


            newPasswordButton.disabled = false;

            newPasswordButton.textContent =
                "Enregistrer le nouveau mot de passe";

            return;
        }


        // ======================================
        // SUCCÈS
        // ======================================

        console.log(
            "Mot de passe modifié :",
            data
        );


        newPasswordMessage.textContent =
            "Votre mot de passe a bien été modifié.";

        newPasswordMessage.className =
            "auth-message success";


        newPasswordButton.textContent =
            "Mot de passe modifié ✓";


        // ======================================
        // REDIRECTION
        // ======================================

        setTimeout(
            function () {

                window.location.href =
                    "./connexion.html";

            },
            1200
        );

    }
);