
"use strict";


/* ==========================================
   RECETTE PLUS
   PARTAGE DE RECETTES DANS LES GROUPES
========================================== */


/* ==========================================
   1. ÉLÉMENTS HTML
========================================== */

const myRecipesList = document.getElementById(
    "myRecipesList"
);

const shareTargetGroups = document.getElementById(
    "shareTargetGroups"
);

const shareRecipeStatus = document.getElementById(
    "shareRecipeStatus"
);

const confirmShareButton = document.getElementById(
    "confirmGroupRecipeShare"
);

const backToGroup = document.getElementById(
    "backToGroup"
);


/* ==========================================
   2. PARAMÈTRES DE LA PAGE
========================================== */

const params = new URLSearchParams(
    window.location.search
);

const initialGroupId = params.get("group_id");


/* ==========================================
   3. SÉLECTIONS
========================================== */

let selectedRecipeId = null;

const selectedGroupIds = new Set();


/* ==========================================
   4. MESSAGES
========================================== */

function showShareStatus(message, isError = false) {

    shareRecipeStatus.textContent = message;

    shareRecipeStatus.classList.toggle(
        "error",
        isError
    );

}


/* ==========================================
   5. CRÉATION D'ÉLÉMENTS HTML
========================================== */

function createElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {

        element.className = className;

    }

    if (text !== undefined) {

        element.textContent = text;

    }

    return element;

}


/* ==========================================
   6. AFFICHER MES RECETTES
========================================== */

async function loadMyRecipes(userId) {

    const { data, error } = await supabaseClient

        .from("recipes")

        .select("id, title, image, description, source, source_url")

        .eq("user_id", userId)

        .in("source", ["manual", "ai", "scan"])

        .order("created_at", {

            ascending: false

        });


    if (error) {

        throw error;

    }


    myRecipesList.replaceChildren();


    if (!data || data.length === 0) {

        myRecipesList.append(

            createElement(

                "p",

                "groups-empty",

                "Vous n'avez aucune recette dans votre carnet."

            )

        );

        return;

    }


    for (const recipe of data.filter((recipe) => {

        return !recipe.source_url ||
            recipe.source_url.trim() === "";

    })) {

        const card = createElement(
            "article",
            "groups-card"
        );


        /* Photo de la recette */

        if (recipe.image) {

            const image = document.createElement("img");

            image.src = recipe.image;

            image.alt = recipe.title || "Photo de recette";

            image.loading = "lazy";

            image.style.width = "100%";

            image.style.height = "170px";

            image.style.objectFit = "cover";

            image.style.borderRadius = "10px";

            card.append(image);

        }


        /* Nom de la recette */

        card.append(

            createElement(
                "h3",
                "",
                recipe.title || "Recette sans titre"
            )

        );


        /* Description */

        if (recipe.description) {

            card.append(

                createElement(
                    "p",
                    "",
                    recipe.description
                )

            );

        }


        /* Bouton de sélection */

        const button = createElement(

            "button",

            "groups-button secondary",

            "Choisir cette recette"

        );

        button.type = "button";


        button.addEventListener("click", () => {

            selectedRecipeId = recipe.id;


            /* Mettre à jour tous les boutons */

            const buttons = myRecipesList.querySelectorAll(
                "button[data-recipe-id]"
            );


            buttons.forEach((item) => {

                const isSelected =
                    item.dataset.recipeId === String(recipe.id);

                item.textContent = isSelected
                    ? "✓ Recette sélectionnée"
                    : "Choisir cette recette";

                item.classList.toggle(
                    "secondary",
                    !isSelected
                );

            });


            showShareStatus("");

        });


        button.dataset.recipeId = String(recipe.id);

        card.append(button);

        myRecipesList.append(card);

    }

}


/* ==========================================
   7. AFFICHER MES GROUPES
========================================== */

async function loadMyGroups(userId) {

    /* Récupérer les groupes dont je suis membre */

    const { data: memberships, error: membershipError } =
        await supabaseClient

            .from("community_group_members")

            .select("group_id")

            .eq("user_id", userId);


    if (membershipError) {

        throw membershipError;

    }


    shareTargetGroups.replaceChildren();


    const groupIds = (memberships || []).map(
        (membership) => membership.group_id
    );


    if (groupIds.length === 0) {

        shareTargetGroups.append(

            createElement(

                "p",

                "groups-empty",

                "Vous n'êtes membre d'aucun groupe."

            )

        );

        return;

    }


    /* Récupérer leurs noms */

    const { data: groups, error: groupsError } =
        await supabaseClient

            .from("community_groups")

            .select("id, name, is_private")

            .in("id", groupIds)

            .order("name");


    if (groupsError) {

        throw groupsError;

    }


    /* Afficher les cases à cocher */

    for (const group of groups || []) {

        const label = createElement(
            "label",
            "groups-share-option"
        );

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";

        checkbox.value = group.id;


        /* Présélectionner le groupe d'origine */

        if (group.id === initialGroupId) {

            checkbox.checked = true;

            selectedGroupIds.add(group.id);

        }


        checkbox.addEventListener("change", () => {

            if (checkbox.checked) {

                selectedGroupIds.add(group.id);

            } else {

                selectedGroupIds.delete(group.id);

            }

        });


        const visibility = group.is_private
            ? "🔒"
            : "🌍";


        const name = createElement(

            "span",

            "",

            `${visibility} ${group.name}`

        );


        label.append(checkbox, name);

        shareTargetGroups.append(label);

    }

}

/* ==========================================
8. PUBLIER UNE RECETTE DANS LES GROUPES
========================================== */

async function publishRecipeToGroups() {

    if (!selectedRecipeId) {

        showShareStatus(
            "Veuillez sélectionner une recette.",
            true
        );

        return;

    }


    if (selectedGroupIds.size === 0) {

        showShareStatus(
            "Veuillez sélectionner au moins un groupe.",
            true
        );

        return;

    }


    confirmShareButton.disabled = true;

    showShareStatus("Publication en cours…");


    try {

        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError) {

            throw authError;

        }


        if (!user) {

            throw new Error(
                "Vous devez être connecté."
            );

        }


        const publications = Array.from(
            selectedGroupIds
        ).map((groupId) => {

            return {

                group_id: groupId,

                recipe_id: selectedRecipeId,

                shared_by: user.id

            };

        });


        const { error } = await supabaseClient

            .from("community_group_recipes")

            .upsert(

                publications,

                {
                    onConflict: "group_id,recipe_id",
                    ignoreDuplicates: true
                }

            );


        if (error) {

            throw error;

        }


        showShareStatus(
            "Recette partagée avec succès !"
        );


        if (initialGroupId) {

            window.location.href =
                `./groupe.html?id=${encodeURIComponent(initialGroupId)}`;

        } else {

            window.location.href = "./groupes.html";

        }


    } catch (error) {

        console.error(
            "Erreur de publication :",
            error
        );


        showShareStatus(
            error.message || "Impossible de partager la recette.",
            true
        );

    } finally {

        confirmShareButton.disabled = false;

    }

}


/* ==========================================
   8. INITIALISATION
========================================== */

async function initGroupRecipeSharing() {

    try {

        /* ==========================================
        ACTIVER LA PUBLICATION
        ========================================== */

        confirmShareButton.disabled = false;

        confirmShareButton.addEventListener(
            "click",
            publishRecipeToGroups
        );


        /* Lien de retour */

        if (initialGroupId) {

            backToGroup.href =
                `./groupe.html?id=${encodeURIComponent(initialGroupId)}`;

        }


        /* Vérifier la connexion */

        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError) {

            throw authError;

        }


        if (!user) {

            throw new Error(
                "Vous devez être connecté pour partager une recette."
            );

        }


        /* Charger les recettes et les groupes */

        await Promise.all([

            loadMyRecipes(user.id),

            loadMyGroups(user.id)

        ]);


        showShareStatus("");


    } catch (error) {

        console.error(
            "Erreur de chargement du partage :",
            error
        );


        showShareStatus(
            error.message || "Impossible de charger les données.",
            true
        );

    }

}


/* ==========================================
   9. DÉMARRAGE
========================================== */

initGroupRecipeSharing();
