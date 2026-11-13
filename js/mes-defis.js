
/* =========================================
   RECETTE PLUS — MES DÉFIS RÉCENTS
   ========================================= */

(() => {
    "use strict";

    const list = document.getElementById("mesDefisList");
    const status = document.getElementById("mesDefisStatus");

    if (!list || !status) return;

    function createElement(tag, text, className) {
        const element = document.createElement(tag);

        if (text !== undefined) {
            element.textContent = text;
        }

        if (className) {
            element.className = className;
        }

        return element;
    }

    function formatDate(value) {
        return new Date(value).toLocaleString("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    async function loadChallenges() {
        try {
            if (typeof supabaseClient === "undefined") {
                throw new Error("Connexion Supabase indisponible.");
            }

            const { data: authData, error: authError } =
                await supabaseClient.auth.getUser();

            if (authError || !authData?.user) {
                status.textContent =
                    "Connectez-vous pour consulter vos défis.";
                return;
            }

            const { data, error } = await supabaseClient
                .from("fridge_challenges")
                .select("id, challenge, created_at, expires_at")
                .eq("user_id", authData.user.id)
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: false })
                .limit(30);

            if (error) throw error;

            list.replaceChildren();

            if (!data || data.length === 0) {
                status.textContent =
                    "Vous n'avez aucun défi récent pour le moment.";
                return;
            }

            status.textContent =
                `${data.length} défi${data.length > 1 ? "s" : ""} récent${data.length > 1 ? "s" : ""}`;

            for (const entry of data) {
                const card = createElement(
                    "article",
                    undefined,
                    "mes-defis-card"
                );

                const title = createElement(
                    "h2",
                    `Défi du ${formatDate(entry.created_at)}`
                );

                card.appendChild(title);

                const expiry = createElement(
                    "p",
                    `Disponible jusqu'au ${formatDate(entry.expires_at)}`,
                    "mes-defis-expiry"
                );

                card.appendChild(expiry);

                const recipesContainer = createElement(
                    "div",
                    undefined,
                    "mes-defis-recipes"
                );

                const days = Array.isArray(entry.challenge?.days)
                    ? entry.challenge.days
                    : [];

                for (const day of days) {
                    const recipes = Array.isArray(day.recipes)
                        ? day.recipes
                        : [];

                    for (const recipe of recipes) {
                        const recipeItem = createElement(
                            "div",
                            recipe.title || "Recette sans titre",
                            "mes-defis-recipe"
                        );

                        recipesContainer.appendChild(recipeItem);
                    }
                }

                card.appendChild(recipesContainer);

                const button = createElement(
                    "a",
                    "Revoir mon défi →",
                    "mes-defis-open"
                );

                button.href =
                    `./voir-defi.html?challenge=${encodeURIComponent(entry.id)}`;

                card.appendChild(button);
                list.appendChild(card);
            }

        } catch (error) {
            console.error("Erreur historique des défis :", error);

            status.textContent =
                "Impossible de charger vos défis pour le moment.";
        }
    }

    loadChallenges();
})();
