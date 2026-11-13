
"use strict";


/* ==========================================
   RECETTE PLUS
   PAGE D'UN GROUPE
========================================== */


/* ==========================================
   1. ÉLÉMENTS HTML
========================================== */

const groupTitle = document.getElementById("groupTitle");

const groupDescription = document.getElementById("groupDescription");

const groupStatus = document.getElementById("groupStatus");

const groupRecipes = document.getElementById("groupRecipes");

const groupMembers = document.getElementById("groupMembers");

const groupDeleteSection = document.getElementById("groupDeleteSection");

const deleteGroupButton = document.getElementById("deleteGroupButton");

let currentGroupIsPrivate = null;

/* ==========================================
   NETTOYAGE DES PHOTOS D'UN GROUPE PUBLIC
   À effectuer AVANT la suppression du groupe :
   les politiques Storage vérifient son existence.
========================================== */

async function removePublicGroupPhotos(groupId) {

    const bucket = supabaseClient.storage.from("group-images");

    // Les photos sont rangées sous : <identifiant du groupe>/cover-...
    // On recommence à la première page après chaque suppression afin de
    // ne pas sauter de fichiers à cause de la pagination.
    while (true) {

        const { data: files, error: listError } = await bucket.list(groupId, {
            limit: 100,
            offset: 0
        });

        if (listError) {
            throw new Error(
                `Impossible de vérifier les photos du groupe : ${listError.message}`
            );
        }

        if (!files || files.length === 0) {
            return;
        }

        const paths = files
            .filter(file => file.name && file.id)
            .map(file => `${groupId}/${file.name}`);

        if (paths.length !== files.length) {
            throw new Error("Le dossier contient un élément non pris en charge.");
        }

        const { error: removeError } = await bucket.remove(paths);

        if (removeError) {
            throw new Error(
                `Impossible de supprimer les photos : ${removeError.message}`
            );
        }
    }
}

if (deleteGroupButton) {
    deleteGroupButton.addEventListener("click", async () => {
        const groupName = groupTitle.textContent.trim();

        const confirmation = prompt(
            `Cette action est irréversible.\n\n` +
            `Pour supprimer définitivement le groupe, ` +
            `saisissez exactement son nom :\n\n${groupName}`
        );

        if (confirmation === null) return;

        if (confirmation !== groupName) {
            alert("Le nom saisi ne correspond pas. Suppression annulée.");
            return;
        }

        const finalConfirmation = confirm(
            `Supprimer définitivement le groupe « ${groupName} » ?\n\n` +
            `Ses membres, invitations, recettes partagées et commentaires seront supprimés.\n\n` +
            `Les recettes originales seront conservées.`
        );

        if (!finalConfirmation) return;

        deleteGroupButton.disabled = true;

        try {
            const groupId = new URLSearchParams(window.location.search).get("id");

            if (!groupId) {
                throw new Error("Identifiant du groupe introuvable.");
            }

            if (currentGroupIsPrivate === null) {
                throw new Error("Visibilité du groupe non chargée.");
            }

            const deletionFunction = currentGroupIsPrivate
                ? "delete_private_community_group"
                : "delete_public_community_group";

            // Ne jamais supprimer le groupe si ses photos n'ont pas pu
            // être vérifiées et retirées du Storage.
            // Les groupes privés conservent leur comportement existant.
            if (!currentGroupIsPrivate) {
                await removePublicGroupPhotos(groupId);
            }

            const { data: deleted, error } = await supabaseClient.rpc(
                deletionFunction,
                { p_group_id: groupId }
            );

            if (!error && deleted !== true) {
                throw new Error("La suppression n'a pas été confirmée.");
            }

            if (error) throw error;

            alert("Le groupe a été supprimé définitivement.");
            window.location.href = "./groupes.html";

        } catch (error) {
            console.error("Erreur suppression du groupe :", error);
            alert(
                "Suppression interrompue : " +
                (error?.message || "Une erreur est survenue.") +
                "\n\nVérifiez le groupe avant de réessayer."
            );
            deleteGroupButton.disabled = false;
        }
    });
}


const inviteGroupMemberButton = document.getElementById(
    "inviteGroupMemberButton"
);

const shareGroupRecipeButton = document.getElementById(
    "shareGroupRecipeButton"
);

const inviteGroupDialog = document.getElementById("inviteGroupDialog");

const closeInviteGroupDialog = document.getElementById(
    "closeInviteGroupDialog"
);

/* ==========================================
   BOUTON - PARTAGER UNE RECETTE
========================================== */

if (shareGroupRecipeButton) {

    shareGroupRecipeButton.addEventListener("click", () => {

        if (!groupId) {
            return;
        }

        window.location.href =
            `./partager-recette-groupe.html?group_id=${encodeURIComponent(groupId)}`;

    });

}


/* ==========================================
   2. IDENTIFIANT DU GROUPE
========================================== */

const urlParams = new URLSearchParams(
    window.location.search
);

const groupId = urlParams.get("id");


/* ==========================================
   3. AFFICHAGE DES MESSAGES
========================================== */

function showGroupStatus(message, isError = false) {

    if (!groupStatus) {
        return;
    }

    groupStatus.textContent = message;

    groupStatus.classList.toggle(
        "error",
        isError
    );

}


/* ==========================================
   RECETTES PUBLIÉES DANS LE GROUPE
========================================== */

async function loadGroupRecipes(currentUserId) {


    // Vérifier si l'utilisateur est administrateur du groupe
    const { data: adminMembership, error: adminError } =
        await supabaseClient
            .from("community_group_members")
            .select("role")
            .eq("group_id", groupId)
            .eq("user_id", currentUserId)
            .maybeSingle();

    if (adminError) throw adminError;

    const isGroupAdmin = adminMembership?.role === "admin";


    const { data: publications, error: publicationsError } =
        await supabaseClient
            .from("community_group_recipes")
            .select("id, recipe_id, created_at")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false });

    if (publicationsError) throw publicationsError;

    groupRecipes.replaceChildren();

    if (!publications?.length) {
        const empty = document.createElement("p");
        empty.className = "groups-empty";
        empty.textContent = "Aucune recette partagée pour le moment.";
        groupRecipes.append(empty);
        return;
    }

    const recipeIds = publications.map(item => item.recipe_id);
    const publicationIds = publications.map(item => item.id);

    // Même relation de profil que celle utilisée par la Communauté.
    // Aucune condition is_public : une recette peut être privée et partagée en groupe.
    const { data: recipes, error: recipesError } = await supabaseClient
        .from("recipes")
        .select(`
            id, user_id, title, image, category, description, time, servings,
            profiles!recipes_user_id_profiles_fkey (first_name, avatar_url)
        `)
        .in("id", recipeIds);

    if (recipesError) throw recipesError;

    // Compter uniquement les commentaires des publications de CE groupe.
    const { data: groupComments, error: commentsError } = await supabaseClient
        .from("community_group_comments")
        .select("group_recipe_id")
        .in("group_recipe_id", publicationIds);

    if (commentsError) throw commentsError;

    // Les J'aime sont liés à chaque publication, jamais à la recette globale.
    const { data: groupLikes, error: likesError } = await supabaseClient
        .from("community_group_likes")
        .select("group_recipe_id, user_id")
        .in("group_recipe_id", publicationIds);

    if (likesError) throw likesError;

    const likeCounts = new Map();
    const myLikedPublications = new Set();

    for (const like of groupLikes || []) {
        const key = String(like.group_recipe_id);
        likeCounts.set(key, (likeCounts.get(key) || 0) + 1);
        if (like.user_id === currentUserId) myLikedPublications.add(key);
    }

    const counts = new Map();
    for (const comment of groupComments || []) {
        const key = String(comment.group_recipe_id);
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    const recipesById = new Map(
        (recipes || []).map(recipe => [String(recipe.id), recipe])
    );

    // Une seule recette ne doit plus s'étirer sur toute la largeur du groupe.
    groupRecipes.style.gridTemplateColumns =
        "repeat(auto-fill, minmax(min(100%, 290px), 1fr))";
    groupRecipes.style.alignItems = "start";

    for (const publication of publications) {
        const recipe = recipesById.get(String(publication.recipe_id));
        if (!recipe) continue;

        const card = document.createElement("article");
        card.className = "community-card";
        card.style.position = "relative";
        card.style.width = "100%";
        card.style.maxWidth = "420px";

        const imageWrap = document.createElement("div");
        imageWrap.className = "community-card-image";

        if (recipe.image) {
            const image = document.createElement("img");
            image.src = recipe.image;
            image.alt = recipe.title || "Photo de recette";
            image.loading = "lazy";
            imageWrap.append(image);
        }
        card.append(imageWrap);

        const content = document.createElement("div");
        content.className = "community-card-content";

        const category = document.createElement("span");
        category.className = "community-card-category";
        category.textContent = recipe.category || "Recette";
        content.append(category);

        const title = document.createElement("h2");
        title.textContent = recipe.title || "Recette sans titre";
        content.append(title);

        const author = document.createElement("div");
        author.className = "community-card-author";
        const firstName = recipe.profiles?.first_name || "Membre Recette Plus";
        const avatarUrl = recipe.profiles?.avatar_url;

        if (avatarUrl && /^https?:\/\//i.test(avatarUrl)) {
            const avatar = document.createElement("img");
            avatar.className = "community-card-avatar";
            avatar.src = avatarUrl;
            avatar.alt = "";
            author.append(avatar);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "community-card-avatar-placeholder";
            placeholder.textContent = firstName.charAt(0).toUpperCase();
            author.append(placeholder);
        }

        const byline = document.createElement("p");
        byline.append(document.createTextNode("Recette publiée par "));
        const authorLink = document.createElement("a");
        authorLink.className = "community-author-link";
        authorLink.href = `./profil-communaute.html?id=${encodeURIComponent(recipe.user_id)}`;
        authorLink.textContent = firstName;
        byline.append(authorLink);
        author.append(byline);
        content.append(author);

        if (recipe.description) {
            const description = document.createElement("p");
            description.className = "community-card-description group-recipe-description";
            description.textContent = recipe.description;
            content.append(description);
        }

        const meta = document.createElement("div");
        meta.className = "community-card-meta";
        if (recipe.time) {
            const time = document.createElement("span");
            time.textContent = `⏱ ${recipe.time}`;
            meta.append(time);
        }
        if (recipe.servings) {
            const servings = document.createElement("span");
            servings.textContent = `👥 ${recipe.servings}`;
            meta.append(servings);
        }
        content.append(meta);

        const stats = document.createElement("div");
        stats.className = "community-card-stats";
        const comments = document.createElement("span");
        comments.textContent = `💬 ${counts.get(String(publication.id)) || 0}`;
        // Bouton J'aime : compteur indépendant pour cette publication.
        const publicationKey = String(publication.id);
        const likeButton = document.createElement("button");
        likeButton.type = "button";
        likeButton.className = "group-recipe-like-button";
        likeButton.style.cssText =
            "background:none;border:0;padding:0;cursor:pointer;font:inherit;" +
            "display:inline-flex;align-items:center;gap:5px;";

        let liked = myLikedPublications.has(publicationKey);
        let likeCount = likeCounts.get(publicationKey) || 0;

        function renderLikeButton() {
            likeButton.textContent = `${liked ? "❤️" : "♡"} ${likeCount}`;
            likeButton.setAttribute("aria-pressed", String(liked));
            likeButton.setAttribute(
                "aria-label",
                `${liked ? "Retirer mon J'aime" : "J'aime"} (${likeCount})`
            );
        }

        renderLikeButton();

        likeButton.addEventListener("click", async () => {
            likeButton.disabled = true;

            try {
                if (liked) {
                    const { error } = await supabaseClient
                        .from("community_group_likes")
                        .delete()
                        .eq("group_recipe_id", publication.id)
                        .eq("user_id", currentUserId);
                    if (error) throw error;
                    liked = false;
                    likeCount = Math.max(0, likeCount - 1);
                } else {
                    const { error } = await supabaseClient
                        .from("community_group_likes")
                        .insert({
                            group_recipe_id: publication.id,
                            user_id: currentUserId
                        });
                    if (error) throw error;
                    liked = true;
                    likeCount += 1;
                }
                renderLikeButton();
                showGroupStatus("");
            } catch (error) {
                console.error("Erreur lors du J'aime :", error);
                showGroupStatus(
                    "Impossible de modifier le J'aime. Réessaie.", true
                );
            } finally {
                likeButton.disabled = false;
            }
        });

        stats.append(likeButton, comments);
        content.append(stats);

        const link = document.createElement("a");
        link.className = "community-view-button";
        link.href = `./recette-groupe.html?publication_id=${encodeURIComponent(publication.id)}`;
        link.textContent = "Voir la recette";
        content.append(link);


        if (isGroupAdmin) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "group-recipe-delete";
            deleteButton.innerHTML = "&times;"; // ×
            deleteButton.title = "Supprimer du groupe";
            deleteButton.setAttribute("aria-label", "Supprimer du groupe");

            deleteButton.addEventListener("click", async () => {
                const confirmed = confirm(
                    `Supprimer « ${recipe.title || "cette recette"} » du groupe ?`
                );

                if (!confirmed) return;

                deleteButton.disabled = true;

                try {
                    const { error } = await supabaseClient.rpc(
                        "admin_delete_group_recipe",
                        { p_group_recipe_id: publication.id }
                    );

                    if (error) throw error;

                    await loadGroupRecipes(currentUserId);

                } catch (error) {
                    console.error("Erreur suppression recette :", error);
                    alert("Impossible de supprimer cette recette du groupe.");
                    deleteButton.disabled = false;
                }
            });

            card.append(deleteButton);
        }


        card.append(content);
        groupRecipes.append(card);
    }

    if (!groupRecipes.childElementCount) {
        const empty = document.createElement("p");
        empty.className = "groups-empty";
        empty.textContent = "Aucune recette accessible dans ce groupe.";
        groupRecipes.append(empty);
    }
}


/* ==========================================
   MEMBRES DU GROUPE
========================================== */

async function loadGroupMembers(currentUserId) {

    if (!groupMembers) return;

    const { data: members, error } = await supabaseClient
        .from("community_group_members")
        .select("user_id, role")
        .eq("group_id", groupId);

    if (error) throw error;

    groupMembers.replaceChildren();

    if (!members || members.length === 0) {
        groupMembers.textContent = "Aucun membre pour le moment.";
        return;
    }

    const userIds = members.map(member => member.user_id);

    const { data: profiles, error: profilesError } =
        await supabaseClient
            .from("profiles")
            .select("id, first_name, avatar_url")
            .in("id", userIds);

    if (profilesError) throw profilesError;

        const profilesById = new Map(
        (profiles || []).map(profile => [profile.id, profile])
    );

    const isAdmin = members.some(member =>
        member.user_id === currentUserId &&
        member.role === "admin"
    );

    members.forEach(member => {

        const profile = profilesById.get(member.user_id);

        const card = document.createElement("div");
        card.className = "group-member-card";

        const avatar = document.createElement("img");
        avatar.className = "group-member-avatar";
        avatar.src = profile?.avatar_url || "../image/user.png";
        avatar.alt = "";

        const details = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = profile?.first_name || "Membre";

        const role = document.createElement("p");
        role.textContent =
            member.role === "owner" || member.role === "admin"
                ? "Administrateur"
                : "Membre";

        
            details.append(name, role);
            card.append(avatar, details);

            // Bouton visible uniquement pour l'administrateur,
            // et uniquement sur les membres ordinaires.
            if (isAdmin && member.role === "member") {

                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.className = "group-member-remove";
                removeButton.textContent = "Retirer";

                removeButton.addEventListener("click", async () => {

                        const confirmed = confirm(
                            `Voulez-vous vraiment retirer ${name.textContent} du groupe ?`
                        );

                        if (!confirmed) return;

                        removeButton.disabled = true;

                        try {
                            const { error } = await supabaseClient.rpc(
                                "remove_community_group_member",
                                {
                                    p_group_id: groupId,
                                    p_member_id: member.user_id
                                }
                            );

                            if (error) throw error;

                            await loadGroupMembers(currentUserId);

                        } catch (error) {
                            console.error("Erreur retrait membre :", error);
                            alert("Impossible de retirer ce membre.");
                            removeButton.disabled = false;
                        }
                    });

                    card.append(removeButton);
                }


    if (
        member.user_id === currentUserId &&
        member.role === "member"
    ) {
        const leaveButton = document.createElement("button");

        leaveButton.type = "button";
        leaveButton.className = "group-member-remove";
        leaveButton.textContent = "Quitter le groupe";

        leaveButton.addEventListener("click", async () => {

            const confirmed = confirm(
                "Voulez-vous vraiment quitter ce groupe privé ?"
            );

            if (!confirmed) return;

            leaveButton.disabled = true;

            try {
                const { error } = await supabaseClient.rpc(
                    "leave_community_group",
                    {
                        p_group_id: groupId
                    }
                );

                if (error) throw error;

                window.location.href = "./groupes.html";

            } catch (error) {
                console.error("Erreur pour quitter le groupe :", error);
                alert("Impossible de quitter le groupe.");
                leaveButton.disabled = false;
            }
        });

    card.append(leaveButton);
}


            groupMembers.append(card);


    });

}


/* ==========================================
   PERSONNES SUIVIES DANS LA COMMUNAUTÉ
========================================== */

async function loadFollowedUsers() {

    const container = document.getElementById("groupInviteUsers");
    const search = document.getElementById("groupMemberSearch");

    if (!container || !search) return;

    container.textContent = "Chargement des personnes suivies...";
    search.value = "";

    try {
        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("Connexion nécessaire.");

        const { data: follows, error: followsError } =
            await supabaseClient
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id);

        if (followsError) throw followsError;

        const { data: members, error: membersError } =
            await supabaseClient
                .from("community_group_members")
                .select("user_id")
                .eq("group_id", groupId);

        if (membersError) throw membersError;

        const memberIds = new Set(
            (members || []).map(member => member.user_id)
        );


        const { data: sentInvitations, error: invitationsError } =
            await supabaseClient
                .from("community_group_invitations")
                .select("invited_user_id")
                .eq("group_id", groupId)
                .eq("invited_by", user.id)
                .eq("status", "pending");

        if (invitationsError) throw invitationsError;

        const invitedIds = new Set(
            (sentInvitations || []).map(invitation => invitation.invited_user_id)
        );


        const followedIds = [
            ...new Set(
                (follows || [])
                    .map(follow => follow.following_id)
                    .filter(id =>
                        id !== user.id && !memberIds.has(id)
                    )
            )
        ];

        if (!followedIds.length) {
            container.textContent =
                "Aucune personne suivie à inviter pour le moment.";
            return;
        }

        const { data: profiles, error: profilesError } =
            await supabaseClient
                .from("profiles")
                .select("id, first_name, avatar_url")
                .in("id", followedIds);

        if (profilesError) throw profilesError;

        const users = (profiles || []).sort((a, b) =>
            (a.first_name || "").localeCompare(
                b.first_name || "", "fr"
            )
        );

        function renderUsers() {
            const term = search.value.trim().toLocaleLowerCase("fr");

            const filtered = users.filter(profile =>
                (profile.first_name || "")
                    .toLocaleLowerCase("fr")
                    .includes(term)
            );

            container.replaceChildren();

            if (!filtered.length) {
                container.textContent = "Aucun utilisateur trouvé.";
                return;
            }

            filtered.forEach(profile => {
                const card = document.createElement("div");
                card.className = "group-invite-user";

                const info = document.createElement("div");
                info.className = "group-invite-user-info";

                const avatar = document.createElement("img");
                avatar.className = "group-invite-user-avatar";
                avatar.src = profile.avatar_url || "../image/user.png";
                avatar.alt = "";

                const name = document.createElement("span");
                name.className = "group-invite-user-name";
                name.textContent = profile.first_name || "Utilisateur";

                const button = document.createElement("button");
                button.type = "button";
                
                
                const alreadyInvited = invitedIds.has(profile.id);

                button.textContent = alreadyInvited
                    ? "Invitation envoyée"
                    : "Inviter";

                button.disabled = alreadyInvited;


                button.addEventListener("click", async () => {
                    button.disabled = true;
                    button.textContent = "Envoi...";

                    try {
                        const { error } = await supabaseClient.rpc(
                            "invite_community_group_member",
                            {
                                p_group_id: groupId,
                                p_invited_user_id: profile.id
                            }
                        );

                        if (error) throw error;

                        button.textContent = "Invitation envoyée";
                        button.title = "Invitation en attente de réponse";

                    } catch (error) {
                        console.error("Erreur invitation :", error);

                        button.textContent = "Réessayer";
                        button.disabled = false;

                        alert("Impossible d'envoyer l'invitation : " + error.message);
                    }
                });


                info.append(avatar, name);
                card.append(info, button);
                container.append(card);
            });
        }

        search.oninput = renderUsers;
        renderUsers();

    } catch (error) {
        console.error("Erreur des personnes suivies :", error);
        container.textContent =
            "Impossible de charger les personnes suivies.";
    }
}


/* ==========================================
   FENÊTRE D'INVITATION
========================================== */

inviteGroupMemberButton?.addEventListener("click", () => {
    if (!inviteGroupDialog) return;

    inviteGroupDialog.showModal();
    loadFollowedUsers();
});

closeInviteGroupDialog?.addEventListener("click", () => {
    inviteGroupDialog?.close();
});

inviteGroupDialog?.addEventListener("click", (event) => {
    if (event.target === inviteGroupDialog) {
        inviteGroupDialog.close();
    }
});



/* ==========================================
   4. CHARGEMENT DU GROUPE
========================================== */

async function loadGroup() {

    try {

        if (!groupId) {

            throw new Error(
                "Aucun groupe n'a été sélectionné."
            );

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
                "Vous devez être connecté pour accéder à ce groupe."
            );

        }


        /* Vérifier que l'utilisateur est membre */

        const {
            data: membership,
            error: membershipError
        } = await supabaseClient
            .from("community_group_members")
            .select("group_id")
            .eq("group_id", groupId)
            .eq("user_id", user.id)
            .maybeSingle();


        if (membershipError) {
            throw membershipError;
        }

        if (!membership) {

            throw new Error(
                "Vous n'êtes pas membre de ce groupe."
            );

        }


        /* Récupérer les informations du groupe */

        const {
            data: group,
            error: groupError
        } = await supabaseClient
            .from("community_groups")
            .select("id, name, description, is_private, created_by")
            .eq("id", groupId)
            .single();


        if (groupError) {
            throw groupError;
        }


        /* Afficher les informations */

        groupTitle.textContent = group.name;

        /* Suppression réservée au créateur, groupe public ou privé */

        currentGroupIsPrivate = group.is_private;

        if (groupDeleteSection) {
            groupDeleteSection.hidden = group.created_by !== user.id;
        }

        /* Afficher le bouton d'invitation pour les groupes privés */

        if (inviteGroupMemberButton) {
            inviteGroupMemberButton.hidden = !group.is_private;
        }

                /* Activer le partage pour les membres du groupe */

        if (shareGroupRecipeButton) {

            shareGroupRecipeButton.disabled = false;

        }

        groupDescription.textContent =
            group.description ||
            "Découvrez les recettes partagées par les membres.";


        /* ==========================================
        CHARGER LES RECETTES DU GROUPE
        ========================================== */

        await loadGroupRecipes(user.id);

        await loadGroupMembers(user.id);

        showGroupStatus("");


    } catch (error) {

        console.error(
            "Erreur de chargement du groupe :",
            error
        );

        showGroupStatus(
            error.message || "Impossible de charger le groupe.",
            true
        );

        if (groupRecipes) {

            groupRecipes.replaceChildren();

        }

    }

}


/* ==========================================
   5. INITIALISATION
========================================== */

loadGroup();
