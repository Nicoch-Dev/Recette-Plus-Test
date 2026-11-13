"use strict";

/* ==========================================
   RECETTE PLUS — FICHE RECETTE DE GROUPE
   Une publication = un contexte de groupe.
========================================== */

const recipeDetails = document.getElementById("communityRecipeDetails");
const backToGroup = document.getElementById("backToGroup");
const commentsList = document.getElementById("commentsList");
const commentsCount = document.getElementById("commentsCount");
const commentForm = document.getElementById("commentForm");
const commentContent = document.getElementById("commentContent");

let activePublicationId = null;
let activeUserId = null;
let likeRequestPending = false;

const params = new URLSearchParams(window.location.search);
const publicationId = params.get("publication_id");

/* ==========================================
   SÉCURITÉ DU CONTENU AFFICHÉ
========================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safeURL(value, fallback = "") {
    if (!value) return fallback;

    try {
        const url = new URL(value, window.location.href);
        if (url.protocol === "http:" || url.protocol === "https:") {
            return url.href;
        }
    } catch (error) {
        console.warn("Adresse d'image invalide :", error);
    }

    return fallback;
}

function getDefaultImage(category) {
    const value = String(category || "").toLowerCase().trim();

    if (value.includes("entrée") || value.includes("entree")) {
        return "../image/default-entree.png";
    }
    if (value.includes("dessert")) {
        return "../image/default-dessert.png";
    }
    if (value.includes("apéritif") || value.includes("aperitif")) {
        return "../image/default-apperitif.png";
    }
    if (["boisson", "cocktail", "café", "cafe", "thé", "the"].some(
        (word) => value.includes(word)
    )) {
        return "../image/default-boisson.png";
    }

    return "../image/default-plat.png";
}

function showRecipeError(message) {
    if (!recipeDetails) return;

    recipeDetails.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = "recipe-error";
    paragraph.textContent = message;
    recipeDetails.appendChild(paragraph);
}

/* ==========================================
   PRÉSENTATION — IDENTIQUE À LA COMMUNAUTÉ
   Sans les likes et commentaires généraux.
========================================== */

function displayGroupRecipe(recipe) {
    if (!recipeDetails) return;

    document.title = `${recipe.title || "Recette du groupe"} | Recette Plus`;

    const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const ingredientsHTML = ingredients
        .map((ingredient) => `<li>${escapeHTML(ingredient)}</li>`)
        .join("");

    let instructionsHTML = "";

    if (Array.isArray(recipe.instructions)) {
        instructionsHTML = recipe.instructions
            .map((instruction, index) => `
                <div class="instruction-step">
                    <strong>Étape ${index + 1}</strong>
                    <p>${escapeHTML(instruction)}</p>
                </div>
            `)
            .join("");
    } else {
        instructionsHTML = `<p>${escapeHTML(recipe.instructions || "")
            .replace(/\r?\n/g, "<br>")}</p>`;
    }

    const image = safeURL(
        recipe.image,
        getDefaultImage(recipe.category)
    );

    const authorName = recipe.profiles?.first_name || "Membre Recette Plus";
    const authorId = encodeURIComponent(recipe.user_id || "");

    recipeDetails.innerHTML = `
        <article class="recipe-full">
            <div class="recipe-full-image">
                <img src="${escapeHTML(image)}"
                     alt="${escapeHTML(recipe.title || "Photo de recette")}">
            </div>

            <div class="recipe-full-content">
                <span class="recipe-category">
                    ${escapeHTML(recipe.category || "Recette")}
                </span>

                <h1>${escapeHTML(recipe.title || "Recette sans titre")}</h1>

                <p class="community-recipe-author">
                    Recette publiée par
                    <a href="./profil-communaute.html?id=${authorId}"
                       class="community-author-link">
                        ${escapeHTML(authorName)}
                    </a>
                </p>

                ${recipe.description ? `
                    <p class="recipe-description">
                        ${escapeHTML(recipe.description)}
                    </p>
                ` : ""}

                <div class="recipe-meta">
                    ${recipe.time ? `<span>⏱ ${escapeHTML(recipe.time)}</span>` : ""}
                    ${recipe.servings ? `<span>👥 ${escapeHTML(recipe.servings)} personnes</span>` : ""}
                </div>

                <div class="community-like-zone">
                    <button
                        id="groupRecipeLikeButton"
                        type="button"
                        class="community-like-button"
                        aria-label="Aimer cette recette"
                        aria-pressed="false"
                        disabled
                    >♡</button>
                    <span id="likesCount">0</span>
                </div>

                <section class="recipe-section">
                    <h2>Ingrédients</h2>
                    <ul class="recipe-ingredients">${ingredientsHTML}</ul>
                </section>

                <section class="recipe-section">
                    <h2>Préparation</h2>
                    <div class="recipe-instructions">${instructionsHTML}</div>
                </section>
            </div>
        </article>
    `;
}

/* ==========================================
   J'AIME PROPRES À LA PUBLICATION DU GROUPE
   Table séparée de "recipe_likes".
========================================== */

async function refreshGroupRecipeLike() {
    if (!activePublicationId || !activeUserId) return;

    const button = document.getElementById("groupRecipeLikeButton");
    const count = document.getElementById("likesCount");
    if (!button || !count) return;

    const { data: likes, error } = await supabaseClient
        .from("community_group_likes")
        .select("user_id")
        .eq("group_recipe_id", activePublicationId);

    if (error) throw error;

    const liked = (likes || []).some(like => like.user_id === activeUserId);
    count.textContent = String((likes || []).length);
    button.textContent = liked ? "♥" : "♡";
    button.classList.toggle("is-liked", liked);
    button.setAttribute("aria-pressed", String(liked));
    button.setAttribute("aria-label", liked ? "Retirer mon J'aime" : "Aimer cette recette");
    button.disabled = false;
}

async function toggleGroupRecipeLike() {
    if (!activePublicationId || !activeUserId || likeRequestPending) return;

    const button = document.getElementById("groupRecipeLikeButton");
    if (!button) return;

    likeRequestPending = true;
    button.disabled = true;

    try {
        const alreadyLiked = button.getAttribute("aria-pressed") === "true";
        const query = supabaseClient.from("community_group_likes");

        const { error } = alreadyLiked
            ? await query.delete()
                .eq("group_recipe_id", activePublicationId)
                .eq("user_id", activeUserId)
            : await query.insert({
                group_recipe_id: activePublicationId,
                user_id: activeUserId
            });

        if (error) throw error;
        await refreshGroupRecipeLike();
    } catch (error) {
        console.error("Erreur J'aime du groupe :", error);
        window.alert(error.message || "Impossible de modifier le J'aime.");
    } finally {
        likeRequestPending = false;
        button.disabled = false;
    }
}

/* ==========================================
   COMMENTAIRES PROPRES À LA PUBLICATION
   Ne jamais utiliser la table "comments".
========================================== */

function formatCommentDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

async function loadGroupComments() {
    if (!activePublicationId || !commentsList) return;


    // Vérifier si l'utilisateur est administrateur du groupe
    const { data: publication, error: publicationError } =
        await supabaseClient
            .from("community_group_recipes")
            .select("group_id")
            .eq("id", activePublicationId)
            .single();

    if (publicationError) throw publicationError;

    const { data: adminMembership, error: adminError } =
        await supabaseClient
            .from("community_group_members")
            .select("role")
            .eq("group_id", publication.group_id)
            .eq("user_id", activeUserId)
            .maybeSingle();

    if (adminError) throw adminError;

    const isGroupAdmin = adminMembership?.role === "admin";


    commentsList.textContent = "Chargement des commentaires…";

    const { data: comments, error } = await supabaseClient
        .from("community_group_comments")
        .select("id, group_recipe_id, user_id, content, created_at")
        .eq("group_recipe_id", activePublicationId)
        .order("created_at", { ascending: true });

    if (error) throw error;

    const entries = comments || [];
    if (commentsCount) {
        commentsCount.textContent =
            `${entries.length} commentaire${entries.length > 1 ? "s" : ""}`;
    }

    commentsList.replaceChildren();
    if (!entries.length) {
        const empty = document.createElement("p");
        empty.textContent = "Aucun commentaire pour le moment. Soyez le premier à commenter !";
        commentsList.appendChild(empty);
        return;
    }

    // Les profils sont facultatifs : une erreur de lecture de profils
    // ne doit jamais empêcher d'afficher les commentaires.
    const profilesById = new Map();
    const userIds = [...new Set(entries.map(c => c.user_id).filter(Boolean))];
    if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabaseClient
            .from("profiles")
            .select("id, first_name, avatar_url")
            .in("id", userIds);

        if (profilesError) {
            console.warn("Profils des auteurs indisponibles :", profilesError);
        } else {
            for (const profile of profiles || []) {
                profilesById.set(profile.id, profile);
            }
        }
    }

    for (const comment of entries) {
        const profile = profilesById.get(comment.user_id);
        const authorName = profile?.first_name || "Membre Recette Plus";
        const avatarURL = safeURL(profile?.avatar_url, "");

        const article = document.createElement("article");
        article.className = "comment-card";

        const top = document.createElement("div");
        top.className = "comment-top";

        const authorBlock = document.createElement("div");
        authorBlock.className = "comment-author";

        if (avatarURL) {
            const avatar = document.createElement("img");
            avatar.className = "comment-avatar";
            avatar.src = avatarURL;
            avatar.alt = "";
            avatar.loading = "lazy";
            authorBlock.appendChild(avatar);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "comment-avatar-placeholder";
            placeholder.textContent = authorName.charAt(0).toUpperCase();
            authorBlock.appendChild(placeholder);
        }

        const identity = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = authorName;

        const date = document.createElement("span");
        if (comment.created_at) {
            const parsedDate = new Date(comment.created_at);
            date.textContent = Number.isNaN(parsedDate.getTime())
                ? ""
                : parsedDate.toLocaleDateString("fr-FR");
        }

        identity.append(name, date);
        authorBlock.appendChild(identity);
        top.appendChild(authorBlock);


        if (isGroupAdmin) {
            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "group-comment-delete";
            deleteButton.textContent = "×";
            deleteButton.title = "Supprimer ce commentaire";
            deleteButton.setAttribute(
                "aria-label",
                "Supprimer ce commentaire"
            );

            deleteButton.addEventListener("click", async () => {
                const confirmed = confirm(
                    "Voulez-vous vraiment supprimer ce commentaire ?"
                );

                if (!confirmed) return;

                deleteButton.disabled = true;

                try {
                    const { error } = await supabaseClient.rpc(
                        "admin_delete_group_comment",
                        { p_comment_id: comment.id }
                    );

                    if (error) throw error;

                    await loadGroupComments();

                } catch (error) {
                    console.error("Erreur suppression commentaire :", error);
                    alert("Impossible de supprimer ce commentaire.");
                    deleteButton.disabled = false;
                }
            });

            top.appendChild(deleteButton);
        }


        const body = document.createElement("p");
        body.textContent = comment.content || "";
        body.style.whiteSpace = "pre-wrap";

        article.append(top, body);
        commentsList.appendChild(article);
    }
}

async function submitGroupComment(event) {
    event.preventDefault();
    if (!activePublicationId || !commentContent || !commentForm) return;

    const content = commentContent.value.trim();
    if (!content || content.length > 4000) {
        window.alert("Le commentaire doit contenir entre 1 et 4 000 caractères.");
        return;
    }

    const submitButton = commentForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("Vous devez être connecté pour commenter.");

        const { error } = await supabaseClient
            .from("community_group_comments")
            .insert({
                group_recipe_id: activePublicationId,
                user_id: user.id,
                content
            });
        if (error) throw error;

        commentContent.value = "";
        await loadGroupComments();
    } catch (error) {
        console.error("Erreur de publication du commentaire :", error);
        window.alert(error.message || "Impossible de publier le commentaire.");
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

if (commentForm) {
    commentForm.addEventListener("submit", submitGroupComment);
}

/* ==========================================
   CHARGEMENT SÉCURISÉ DE LA PUBLICATION
========================================== */

async function loadGroupRecipe() {
    // Les commentaires ne deviennent accessibles qu'après
    // vérification de l'appartenance au groupe.
    if (commentForm) commentForm.hidden = true;
    if (commentsCount) commentsCount.textContent = "";
    if (commentsList) commentsList.textContent = "Chargement…";

    try {
        if (!publicationId || !/^\d+$/.test(publicationId)) {
            throw new Error("Aucune publication valide n'a été sélectionnée.");
        }

        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;
        if (!user) {
            throw new Error("Vous devez être connecté pour voir cette recette.");
        }

        const { data: publication, error: publicationError } =
            await supabaseClient
                .from("community_group_recipes")
                .select("id, group_id, recipe_id, shared_by")
                .eq("id", publicationId)
                .single();

        if (publicationError) throw publicationError;

        const { data: membership, error: membershipError } =
            await supabaseClient
                .from("community_group_members")
                .select("group_id")
                .eq("group_id", publication.group_id)
                .eq("user_id", user.id)
                .maybeSingle();

        if (membershipError) throw membershipError;
        if (!membership) {
            throw new Error("Vous n'êtes pas membre de ce groupe.");
        }

        if (backToGroup) {
            backToGroup.href =
                `./groupe.html?id=${encodeURIComponent(publication.group_id)}`;
            backToGroup.style.display = "inline-flex";
            backToGroup.style.alignItems = "center";
            backToGroup.style.gap = "8px";
            backToGroup.style.color = "#247c48";
            backToGroup.style.fontWeight = "600";
            backToGroup.style.textDecoration = "none";
            backToGroup.style.marginBottom = "20px";
        }

        // Aucune condition is_public : les recettes privées
        // peuvent être partagées avec les membres d'un groupe.
        const { data: recipe, error: recipeError } =
            await supabaseClient
                .from("recipes")
                .select(`
                    id, title, image, description, category, time,
                    servings, ingredients, instructions, user_id,
                    profiles!recipes_user_id_profiles_fkey (
                        first_name, avatar_url
                    )
                `)
                .eq("id", publication.recipe_id)
                .single();

        if (recipeError) throw recipeError;
        displayGroupRecipe(recipe);

        activePublicationId = publication.id;
        activeUserId = user.id;

        const likeButton = document.getElementById("groupRecipeLikeButton");
        if (likeButton) {
            likeButton.addEventListener("click", toggleGroupRecipeLike);
            try {
                await refreshGroupRecipeLike();
            } catch (likesError) {
                console.error("Erreur de lecture des J'aime :", likesError);
                likeButton.title = "Impossible de charger les J'aime";
            }
        }

        if (commentForm) commentForm.hidden = false;
        try {
            await loadGroupComments();
        } catch (commentsError) {
            console.error("Erreur de lecture des commentaires :", commentsError);
            if (commentsList) {
                commentsList.textContent = "Impossible de charger les commentaires pour le moment.";
            }
        }

    } catch (error) {
        console.error("Erreur de chargement de la recette du groupe :", error);
        showRecipeError(error.message || "Impossible de charger cette recette.");
        if (commentsList) commentsList.textContent = "";
    }
}

loadGroupRecipe();
