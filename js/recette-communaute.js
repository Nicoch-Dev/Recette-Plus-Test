// ==========================================
// SÉCURITÉ - TEXTE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ==========================================
// SÉCURITÉ - URL
// ==========================================

function safeURL(value, fallback = "") {

    if (!value) {
        return fallback;
    }


    try {

        const url =
            new URL(
                value,
                window.location.href
            );


        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {

            return value;

        }

    } catch (error) {

        console.error(
            "URL invalide :",
            error
        );

    }


    return fallback;

}


// ==========================================
// ÉLÉMENTS DE LA PAGE
// ==========================================

const recipeDetails =
    document.getElementById(
        "communityRecipeDetails"
    );

const commentsList =
    document.getElementById(
        "commentsList"
    );

const commentsCount =
    document.getElementById(
        "commentsCount"
    );

const commentForm =
    document.getElementById(
        "commentForm"
    );

const commentContent =
    document.getElementById(
        "commentContent"
    );


// ==========================================
// ID DE LA RECETTE
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );

const recipeId =
    Number(
        params.get("id")
    );


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;

let commentsRealtimeChannel = null;

let likesRealtimeChannel = null;

let recipeRealtimeChannel = null;


// ==========================================
// IMAGE PAR DÉFAUT
// ==========================================

function getDefaultImage(category) {

    const normalizedCategory =
        (category || "")
            .toLowerCase()
            .trim();


    if (
        normalizedCategory.includes("entrée") ||
        normalizedCategory.includes("entree")
    ) {
        return "../image/default-entree.png";
    }


    if (
        normalizedCategory.includes("plat")
    ) {
        return "../image/default-plat.png";
    }


    if (
        normalizedCategory.includes("dessert")
    ) {
        return "../image/default-dessert.png";
    }


    if (
        normalizedCategory.includes("apéritif") ||
        normalizedCategory.includes("aperitif")
    ) {
        return "../image/default-apperitif.png";
    }


    if (
        normalizedCategory.includes("boisson") ||
        normalizedCategory.includes("cocktail") ||
        normalizedCategory.includes("café") ||
        normalizedCategory.includes("cafe") ||
        normalizedCategory.includes("thé") ||
        normalizedCategory.includes("the")
    ) {
        return "../image/default-boisson.png";
    }


    return "../image/default-plat.png";

}


// ==========================================
// UTILISATEUR CONNECTÉ
// ==========================================

async function loadCurrentUser() {

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
            "Erreur utilisateur connecté :",
            error
        );

        currentUser = null;

        return;
    }


    currentUser =
        user || null;

}


// ==========================================
// CHARGEMENT DE LA RECETTE
// ==========================================

async function loadCommunityRecipe() {

    if (
        !recipeId ||
        !recipeDetails
    ) {

        if (recipeDetails) {

            recipeDetails.innerHTML = `

                <p>
                    Recette introuvable.
                </p>

            `;

        }

        return;
    }


    const {
        data: recipe,
        error
    } =
        await supabaseClient
            .from("recipes")
            .select(`

                *,

                profiles!recipes_user_id_profiles_fkey (
                    first_name,
                    avatar_url
                )

            `)
            .eq(
                "id",
                recipeId
            )
            .eq(
                "is_public",
                true
            )
            .single();


    if (
        error ||
        !recipe
    ) {

        console.error(
            "Erreur recette communauté :",
            error
        );


        recipeDetails.innerHTML = `

            <div class="recipe-error">

                <p>
                    Cette recette n'est pas disponible.
                </p>

                <a href="./communaute.html">
                    ← Retour à la communauté
                </a>

            </div>

        `;

        return;
    }


    displayCommunityRecipe(
        recipe
    );

}


// ==========================================
// AFFICHAGE DE LA RECETTE
// ==========================================

function displayCommunityRecipe(recipe) {

    if (!recipeDetails) {
        return;
    }


    document.title =
        `${recipe.title} | Recette Plus`;


    const ingredients =
        Array.isArray(
            recipe.ingredients
        )
            ? recipe.ingredients
            : [];


    const ingredientsHTML =
        ingredients
            .map(
                function (ingredient) {

                    return `

                        <li>
                            ${escapeHTML(ingredient)}
                        </li>

                    `;

                }
            )
            .join("");


    let instructionsHTML = "";


    if (
        Array.isArray(
            recipe.instructions
        )
    ) {

        instructionsHTML =
            recipe.instructions
                .map(
                    function (
                        instruction,
                        index
                    ) {

                        return `

                            <div class="instruction-step">

                                <strong>
                                    Étape ${index + 1}
                                </strong>

                                <p>
                                    ${escapeHTML(instruction)}
                                </p>

                            </div>

                        `;

                    }
                )
                .join("");

    } else {

        const safeInstructions =
            escapeHTML(
                recipe.instructions || ""
            )
                .replace(
                    /\n/g,
                    "<br>"
                );


        instructionsHTML = `

            <p>
                ${safeInstructions}
            </p>

        `;

    }


    const defaultImage =
        getDefaultImage(
            recipe.category
        );


    const image =
        safeURL(
            recipe.image,
            defaultImage
        );


    const authorName =
        recipe.profiles?.first_name ||
        "Membre Recette Plus";


    const safeUserId =
        encodeURIComponent(
            recipe.user_id || ""
        );


    recipeDetails.innerHTML = `

        <article class="recipe-full">

            <div class="recipe-full-image">

                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(recipe.title)}"
                >

            </div>


            <div class="recipe-full-content">

                <span class="recipe-category">

                    ${
                        escapeHTML(
                            recipe.category ||
                            "Recette"
                        )
                    }

                </span>


                <h1>
                    ${escapeHTML(recipe.title)}
                </h1>


                <p class="community-recipe-author">

                    Recette publiée par

                    <a
                        href="./profil-communaute.html?id=${safeUserId}"
                        class="community-author-link"
                    >
                        ${escapeHTML(authorName)}
                    </a>

                </p>


                ${
                    recipe.description

                        ? `

                            <p class="recipe-description">
                                ${escapeHTML(recipe.description)}
                            </p>

                          `

                        : ""
                }


                <div class="recipe-meta">

                    ${
                        recipe.time

                            ? `

                                <span>
                                    ⏱ ${escapeHTML(recipe.time)}
                                </span>

                              `

                            : ""
                    }


                    ${
                        recipe.servings

                            ? `

                                <span>
                                    👥 ${escapeHTML(recipe.servings)} personnes
                                </span>

                              `

                            : ""
                    }

                </div>


                <div class="community-like-zone">

                    <button
                        type="button"
                        id="likeButton"
                        class="community-like-button"
                        aria-label="Aimer cette recette"
                    >
                        ♡
                    </button>

                    <span id="likesCount">
                        0
                    </span>

                </div>


                <section class="recipe-section">

                    <h2>
                        Ingrédients
                    </h2>

                    <ul class="recipe-ingredients">
                        ${ingredientsHTML}
                    </ul>

                </section>


                <section class="recipe-section">

                    <h2>
                        Préparation
                    </h2>

                    <div class="recipe-instructions">
                        ${instructionsHTML}
                    </div>

                </section>

            </div>

        </article>

    `;


    setupLikeButton(
        recipe.id
    );

}


// ==========================================
// CHARGEMENT DES COMMENTAIRES
// ==========================================

async function loadComments() {

    if (
        !recipeId ||
        !commentsList
    ) {
        return;
    }


    const {
        data: comments,
        error
    } =
        await supabaseClient
            .from("comments")
            .select(`

                id,
                recipe_id,
                user_id,
                content,
                created_at,

                profiles!comments_user_id_profiles_fkey (
                    first_name,
                    avatar_url
                )

            `)
            .eq(
                "recipe_id",
                recipeId
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Erreur commentaires :",
            error
        );


        commentsList.innerHTML = `

            <p>
                Impossible de charger les commentaires.
            </p>

        `;

        return;
    }


    const safeComments =
        comments || [];


    updateCommentsCount(
        safeComments.length
    );


    if (
        safeComments.length === 0
    ) {

        commentsList.innerHTML = `

            <p class="comments-empty">
                Aucun commentaire pour le moment.
            </p>

        `;

        return;
    }


    displayComments(
        safeComments
    );

}


// ==========================================
// AFFICHAGE DES COMMENTAIRES
// ==========================================

function displayComments(comments) {

    if (!commentsList) {
        return;
    }


    commentsList.innerHTML =
        comments
            .map(
                function (comment) {

                    const date =
                        new Date(
                            comment.created_at
                        )
                            .toLocaleDateString(
                                "fr-FR"
                            );


                    const canDelete =
                        currentUser &&
                        currentUser.id ===
                            comment.user_id;


                    const authorName =
                        comment.profiles
                            ?.first_name ||

                        "Membre Recette Plus";


                    const avatar =
                        safeURL(
                            comment.profiles
                                ?.avatar_url,
                            ""
                        );


                    const initial =
                        authorName
                            .charAt(0)
                            .toUpperCase();


                    return `

                        <article class="comment-card">

                            <div class="comment-top">

                                <div class="comment-author">

                                    ${
                                        avatar

                                            ? `

                                                <img
                                                    src="${escapeHTML(avatar)}"
                                                    alt=""
                                                    class="comment-avatar"
                                                >

                                              `

                                            : `

                                                <div
                                                    class="comment-avatar-placeholder"
                                                >
                                                    ${escapeHTML(initial)}
                                                </div>

                                              `
                                    }


                                    <div>

                                        <strong>
                                            ${escapeHTML(authorName)}
                                        </strong>

                                        <span>
                                            ${escapeHTML(date)}
                                        </span>

                                    </div>

                                </div>


                                ${
                                    canDelete

                                        ? `

                                            <button
                                                type="button"
                                                class="delete-comment-button"
                                                data-comment-id="${Number(comment.id)}"
                                            >
                                                Supprimer
                                            </button>

                                          `

                                        : ""
                                }

                            </div>


                            <p>
                                ${escapeHTML(comment.content)}
                            </p>

                        </article>

                    `;

                }
            )
            .join("");


    setupDeleteCommentButtons();

}


// ==========================================
// COMPTEUR DES COMMENTAIRES
// ==========================================

function updateCommentsCount(count) {

    if (!commentsCount) {
        return;
    }


    commentsCount.textContent =
        count <= 1

            ? `${count} commentaire`

            : `${count} commentaires`;

}


// ==========================================
// AJOUTER UN COMMENTAIRE
// ==========================================

if (commentForm) {

    commentForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!currentUser) {

                window.location.href =
                    "./connexion.html";

                return;
            }


            const content =
                commentContent
                    ?.value
                    .trim();


            if (!content) {
                return;
            }


            const submitButton =
                commentForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {
                submitButton.disabled = true;
            }


            const {
                error
            } =
                await supabaseClient
                    .from("comments")
                    .insert({

                        recipe_id:
                            recipeId,

                        user_id:
                            currentUser.id,

                        content:
                            content

                    });


            if (error) {

                console.error(
                    "Erreur ajout commentaire :",
                    error
                );


                alert(
                    "Impossible de publier le commentaire."
                );


                if (submitButton) {
                    submitButton.disabled = false;
                }

                return;
            }


            if (commentContent) {
                commentContent.value = "";
            }


            await loadComments();


            if (submitButton) {
                submitButton.disabled = false;
            }

        }
    );

}


// ==========================================
// SUPPRIMER UN COMMENTAIRE
// ==========================================

function setupDeleteCommentButtons() {

    const buttons =
        document.querySelectorAll(
            ".delete-comment-button"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                async function () {

                    const commentId =
                        Number(
                            button.dataset
                                .commentId
                        );


                    if (!commentId) {
                        return;
                    }


                    const confirmation =
                        confirm(
                            "Supprimer ce commentaire ?"
                        );


                    if (!confirmation) {
                        return;
                    }


                    button.disabled = true;


                    const {
                        error
                    } =
                        await supabaseClient
                            .from("comments")
                            .delete()
                            .eq(
                                "id",
                                commentId
                            );


                    if (error) {

                        console.error(
                            "Erreur suppression commentaire :",
                            error
                        );


                        button.disabled = false;

                        return;
                    }


                    await loadComments();

                }
            );

        }
    );

}


// ==========================================
// LIKES
// ==========================================

async function setupLikeButton(
    recipeId
) {

    const likeButton =
        document.getElementById(
            "likeButton"
        );

    const likesCount =
        document.getElementById(
            "likesCount"
        );


    if (
        !likeButton ||
        !likesCount
    ) {
        return;
    }


    const {
        data: likes,
        error: likesError
    } =
        await supabaseClient
            .from("recipe_likes")
            .select(
                "id, user_id"
            )
            .eq(
                "recipe_id",
                recipeId
            );


    if (likesError) {

        console.error(
            "Erreur chargement likes :",
            likesError
        );

        return;
    }


    const safeLikes =
        likes || [];


    likesCount.textContent =
        safeLikes.length;


    const existingLike =
        currentUser

            ? safeLikes.find(
                function (like) {

                    return (
                        like.user_id ===
                        currentUser.id
                    );

                }
            )

            : null;


    updateLikeButton(
        likeButton,
        !!existingLike
    );


    likeButton.addEventListener(
        "click",
        async function () {

            if (!currentUser) {

                window.location.href =
                    "./connexion.html";

                return;
            }


            likeButton.disabled =
                true;


            const {
                data: currentLike,
                error: checkError
            } =
                await supabaseClient
                    .from("recipe_likes")
                    .select("id")
                    .eq(
                        "recipe_id",
                        recipeId
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .maybeSingle();


            if (checkError) {

                console.error(
                    "Erreur vérification like :",
                    checkError
                );


                likeButton.disabled = false;

                return;
            }


            if (currentLike) {

                const {
                    error: deleteError
                } =
                    await supabaseClient
                        .from("recipe_likes")
                        .delete()
                        .eq(
                            "id",
                            currentLike.id
                        );


                if (deleteError) {

                    console.error(
                        "Erreur suppression like :",
                        deleteError
                    );


                    likeButton.disabled = false;

                    return;
                }

            } else {

                const {
                    error: insertError
                } =
                    await supabaseClient
                        .from("recipe_likes")
                        .insert({

                            recipe_id:
                                recipeId,

                            user_id:
                                currentUser.id

                        });


                if (insertError) {

                    console.error(
                        "Erreur ajout like :",
                        insertError
                    );


                    likeButton.disabled = false;

                    return;
                }

            }


            await refreshLikes(
                recipeId,
                likeButton,
                likesCount
            );


            likeButton.disabled =
                false;

        }
    );

}


// ==========================================
// ACTUALISER LES LIKES
// ==========================================

async function refreshLikes(
    recipeId,
    likeButton,
    likesCount
) {

    const {
        data: likes,
        error
    } =
        await supabaseClient
            .from("recipe_likes")
            .select(
                "id, user_id"
            )
            .eq(
                "recipe_id",
                recipeId
            );


    if (error) {

        console.error(
            "Erreur actualisation likes :",
            error
        );

        return;
    }


    const safeLikes =
        likes || [];


    likesCount.textContent =
        safeLikes.length;


    const hasLiked =
        currentUser

            ? safeLikes.some(
                function (like) {

                    return (
                        like.user_id ===
                        currentUser.id
                    );

                }
            )

            : false;


    updateLikeButton(
        likeButton,
        hasLiked
    );

}


// ==========================================
// ACTUALISER LES LIKES DE LA RECETTE
// ==========================================

async function refreshCurrentRecipeLikes() {

    const likeButton =
        document.getElementById(
            "likeButton"
        );

    const likesCount =
        document.getElementById(
            "likesCount"
        );


    if (
        !likeButton ||
        !likesCount
    ) {
        return;
    }


    await refreshLikes(
        recipeId,
        likeButton,
        likesCount
    );

}


// ==========================================
// APPARENCE DU BOUTON LIKE
// ==========================================

function updateLikeButton(
    button,
    isLiked
) {

    if (!button) {
        return;
    }


    if (isLiked) {

        button.textContent =
            "♥";

        button.classList.add(
            "is-liked"
        );

    } else {

        button.textContent =
            "♡";

        button.classList.remove(
            "is-liked"
        );

    }

}


// ==========================================
// REALTIME - COMMENTAIRES
// ==========================================

function setupRealtimeComments() {

    commentsRealtimeChannel =
        supabaseClient
            .channel(
                `recipe-comments-${recipeId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "comments",
                    filter:
                        `recipe_id=eq.${recipeId}`
                },
                async function () {

                    await loadComments();

                }
            )
            .subscribe();

}


// ==========================================
// REALTIME - LIKES
// ==========================================

function setupRealtimeLikes() {

    likesRealtimeChannel =
        supabaseClient
            .channel(
                `recipe-likes-${recipeId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "recipe_likes",
                    filter:
                        `recipe_id=eq.${recipeId}`
                },
                async function () {

                    await refreshCurrentRecipeLikes();

                }
            )
            .subscribe();

}


// ==========================================
// REALTIME - RECETTE
// ==========================================

function setupRealtimeRecipe() {

    recipeRealtimeChannel =
        supabaseClient
            .channel(
                `community-recipe-${recipeId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "recipes",
                    filter:
                        `id=eq.${recipeId}`
                },
                async function (payload) {

                    const updatedRecipe =
                        payload.new;


                    if (
                        payload.eventType ===
                        "DELETE"
                    ) {

                        window.location.href =
                            "./communaute.html";

                        return;
                    }


                    if (
                        updatedRecipe &&
                        updatedRecipe.is_public ===
                            false
                    ) {

                        window.location.href =
                            "./communaute.html";

                    }

                }
            )
            .subscribe();

}


// ==========================================
// NETTOYAGE REALTIME
// ==========================================

window.addEventListener(
    "beforeunload",
    function () {

        if (commentsRealtimeChannel) {

            supabaseClient
                .removeChannel(
                    commentsRealtimeChannel
                );

        }


        if (likesRealtimeChannel) {

            supabaseClient
                .removeChannel(
                    likesRealtimeChannel
                );

        }


        if (recipeRealtimeChannel) {

            supabaseClient
                .removeChannel(
                    recipeRealtimeChannel
                );

        }

    }
);


// ==========================================
// LANCEMENT
// ==========================================

async function initCommunityRecipe() {

    await loadCurrentUser();

    await loadCommunityRecipe();

    await loadComments();


    setupRealtimeComments();

    setupRealtimeLikes();

    setupRealtimeRecipe();

}


initCommunityRecipe();