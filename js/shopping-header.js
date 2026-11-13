// ==========================================
// BADGE LISTE DE COURSES
// ==========================================

async function updateShoppingBadge() {

    const badge =
        document.getElementById(
            "shoppingBadge"
        );


    if (!badge) {
        return;
    }


    try {

        // ==================================
        // UTILISATEUR CONNECTÉ
        // ==================================

        const {
            data: {
                user
            }
        } =
            await supabaseClient
                .auth
                .getUser();


        if (!user) {

            badge.hidden = true;

            return;

        }


        // ==================================
        // COMPTER LES ARTICLES
        // NON COCHÉS
        // ==================================

        const {
            count,
            error
        } =
            await supabaseClient
                .from("shopping_list")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq(
                    "user_id",
                    user.id
                )
                .eq(
                    "checked",
                    false
                );


        if (error) {
            throw error;
        }


        // ==================================
        // AFFICHAGE
        // ==================================

        if (
            !count ||
            count === 0
        ) {

            badge.hidden = true;

            badge.textContent = "0";

            return;

        }


        badge.textContent =
            count > 99
                ? "99+"
                : String(count);


        badge.hidden = false;


    } catch (error) {

        console.error(
            "Erreur badge liste de courses :",
            error
        );


        badge.hidden = true;

    }

}


// ==========================================
// LANCEMENT
// ==========================================

updateShoppingBadge();