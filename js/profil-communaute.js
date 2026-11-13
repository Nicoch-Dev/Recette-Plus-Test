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

const publicProfile =
    document.getElementById(
        "publicProfile"
    );

const profileRecipes =
    document.getElementById(
        "profileRecipes"
    );

const params =
    new URLSearchParams(
        window.location.search
    );

const profileId =
    params.get("id");

const followButton =
    document.getElementById(
        "followButton"
    );

const followersCount =
    document.getElementById(
        "followersCount"
    );

const followingCount =
    document.getElementById(
        "followingCount"
    );

const followersButton =
    document.getElementById(
        "followersButton"
    );

const followingButton =
    document.getElementById(
        "followingButton"
    );

const followModal =
    document.getElementById(
        "followModal"
    );

const followModalOverlay =
    document.getElementById(
        "followModalOverlay"
    );

const closeFollowModal =
    document.getElementById(
        "closeFollowModal"
    );

const followModalTitle =
    document.getElementById(
        "followModalTitle"
    );

const followMembersList =
    document.getElementById(
        "followMembersList"
    );


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;


// ==========================================
// IMAGE PAR DÉFAUT
// ==========================================

function getProfileDefaultImage(category) {

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
// CHARGEMENT DU PROFIL
// ==========================================

async function loadPublicProfile() {

    if (!profileId) {

        if (publicProfile) {

            publicProfile.innerHTML = `

                <p>
                    Profil introuvable.
                </p>

            `;

        }

        return;
    }


    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, first_name, avatar_url, bio"
            )
            .eq(
                "id",
                profileId
            )
            .single();


    if (
        profileError ||
        !profile
    ) {

        console.error(
            "Erreur profil :",
            profileError
        );


        if (publicProfile) {

            publicProfile.innerHTML = `

                <p>
                    Impossible de charger ce profil.
                </p>

            `;

        }

        return;
    }


    const {
        data: recipes,
        error: recipesError
    } =
        await supabaseClient
            .from("recipes")
            .select("*")
            .eq(
                "user_id",
                profileId
            )
            .eq(
                "is_public",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (recipesError) {

        console.error(
            "Erreur recettes :",
            recipesError
        );

        return;
    }


    displayProfile(
        profile,
        recipes || []
    );


    displayProfileRecipes(
        recipes || []
    );

}


// ==========================================
// AFFICHAGE DU PROFIL
// ==========================================

function displayProfile(
    profile,
    recipes
) {

    if (!publicProfile) {
        return;
    }


    const name =
        profile.first_name ||
        "Membre Recette Plus";


    const avatar =
        safeURL(
            profile.avatar_url,
            ""
        );


    publicProfile.innerHTML = `

        <div class="public-profile-avatar">

            ${
                avatar

                    ? `

                        <img
                            src="${escapeHTML(avatar)}"
                            alt="${escapeHTML(name)}"
                        >

                      `

                    : `

                        <div class="public-profile-letter">

                            ${
                                escapeHTML(
                                    name
                                        .charAt(0)
                                        .toUpperCase()
                                )
                            }

                        </div>

                      `
            }

        </div>


        <h1>
            ${escapeHTML(name)}
        </h1>


        ${
            profile.bio

                ? `

                    <p class="public-profile-bio">
                        ${escapeHTML(profile.bio)}
                    </p>

                  `

                : ""
        }


        <p>

            ${recipes.length}

            ${
                recipes.length <= 1
                    ? "recette publiée"
                    : "recettes publiées"
            }

        </p>

    `;


    document.title =
        `${name} | Recette Plus`;

}


// ==========================================
// RECETTES DU MEMBRE
// ==========================================

function displayProfileRecipes(
    recipes
) {

    if (!profileRecipes) {
        return;
    }


    if (
        !recipes ||
        recipes.length === 0
    ) {

        profileRecipes.innerHTML = `

            <p>
                Ce membre n'a encore publié
                aucune recette.
            </p>

        `;

        return;
    }


    profileRecipes.innerHTML =
        recipes
            .map(
                function (recipe) {

                    const defaultImage =
                        getProfileDefaultImage(
                            recipe.category
                        );


                    const image =
                        safeURL(
                            recipe.image,
                            defaultImage
                        );


                    const safeRecipeId =
                        Number(
                            recipe.id
                        );


                    return `

                        <article
                            class="community-card"
                        >

                            <div
                                class="community-card-image"
                            >

                                <img
                                    src="${escapeHTML(image)}"
                                    alt="${escapeHTML(recipe.title)}"
                                >

                            </div>


                            <div
                                class="community-card-content"
                            >

                                <span
                                    class="community-card-category"
                                >

                                    ${
                                        escapeHTML(
                                            recipe.category ||
                                            "Recette"
                                        )
                                    }

                                </span>


                                <h2>
                                    ${escapeHTML(recipe.title)}
                                </h2>


                                ${
                                    recipe.time

                                        ? `

                                            <div
                                                class="community-card-meta"
                                            >

                                                <span>
                                                    ⏱ ${
                                                        escapeHTML(
                                                            recipe.time
                                                        )
                                                    }
                                                </span>

                                            </div>

                                          `

                                        : ""
                                }


                                <a
                                    href="./recette-communaute.html?id=${safeRecipeId}"
                                    class="community-view-button"
                                >
                                    Voir la recette
                                </a>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


// ==========================================
// COMPTEURS ABONNÉS / ABONNEMENTS
// ==========================================

async function loadFollowStats() {

    if (
        !profileId ||
        !followersCount ||
        !followingCount
    ) {
        return;
    }


    const {
        count: followers,
        error: followersError
    } =
        await supabaseClient
            .from("follows")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "following_id",
                profileId
            );


    const {
        count: following,
        error: followingError
    } =
        await supabaseClient
            .from("follows")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "follower_id",
                profileId
            );


    if (
        followersError ||
        followingError
    ) {

        console.error(
            "Erreur compteur abonnements :",
            followersError ||
            followingError
        );

        return;
    }


    followersCount.textContent =
        followers || 0;


    followingCount.textContent =
        following || 0;

}


// ==========================================
// BOUTON SUIVRE DU PROFIL
// ==========================================

async function setupFollowButton() {

    if (
        !followButton ||
        !currentUser ||
        !profileId
    ) {
        return;
    }


    if (
        currentUser.id ===
        profileId
    ) {

        followButton.style.display =
            "none";

        return;
    }


    const {
        data: existingFollow,
        error
    } =
        await supabaseClient
            .from("follows")
            .select("id")
            .eq(
                "follower_id",
                currentUser.id
            )
            .eq(
                "following_id",
                profileId
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Erreur vérification suivi :",
            error
        );

        return;
    }


    updateFollowButton(
        !!existingFollow
    );


    followButton.addEventListener(
        "click",
        async function () {

            followButton.disabled =
                true;


            const {
                data: currentFollow,
                error: checkError
            } =
                await supabaseClient
                    .from("follows")
                    .select("id")
                    .eq(
                        "follower_id",
                        currentUser.id
                    )
                    .eq(
                        "following_id",
                        profileId
                    )
                    .maybeSingle();


            if (checkError) {

                console.error(
                    "Erreur suivi :",
                    checkError
                );


                followButton.disabled =
                    false;

                return;
            }


            if (currentFollow) {

                const {
                    error: deleteError
                } =
                    await supabaseClient
                        .from("follows")
                        .delete()
                        .eq(
                            "id",
                            currentFollow.id
                        );


                if (deleteError) {

                    console.error(
                        "Erreur désabonnement :",
                        deleteError
                    );


                    followButton.disabled =
                        false;

                    return;
                }


                updateFollowButton(
                    false
                );

            } else {

                const {
                    error: insertError
                } =
                    await supabaseClient
                        .from("follows")
                        .insert({

                            follower_id:
                                currentUser.id,

                            following_id:
                                profileId

                        });


                if (insertError) {

                    console.error(
                        "Erreur abonnement :",
                        insertError
                    );


                    followButton.disabled =
                        false;

                    return;
                }


                updateFollowButton(
                    true
                );

            }


            await loadFollowStats();


            followButton.disabled =
                false;

        }
    );

}


// ==========================================
// APPARENCE DU BOUTON PRINCIPAL
// ==========================================

function updateFollowButton(
    isFollowing
) {

    if (!followButton) {
        return;
    }


    if (isFollowing) {

        followButton.textContent =
            "✓ Suivi";


        followButton.classList.add(
            "is-following"
        );

    } else {

        followButton.textContent =
            "Suivre";


        followButton.classList.remove(
            "is-following"
        );

    }

}


// ==========================================
// OUVRIR LA FENÊTRE
// ==========================================

function openFollowModal(title) {

    if (
        !followModal ||
        !followModalTitle
    ) {
        return;
    }


    followModalTitle.textContent =
        title;


    followModal.classList.add(
        "is-open"
    );


    followModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );

}


// ==========================================
// FERMER LA FENÊTRE
// ==========================================

function closeFollowModalWindow() {

    if (!followModal) {
        return;
    }


    followModal.classList.remove(
        "is-open"
    );


    followModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "modal-open"
    );

}


// ==========================================
// AFFICHAGE DES MEMBRES
// ==========================================

function displayFollowMembers(
    members
) {

    if (!followMembersList) {
        return;
    }


    if (
        !members ||
        members.length === 0
    ) {

        followMembersList.innerHTML = `

            <p class="follow-members-empty">
                Aucun membre pour le moment.
            </p>

        `;

        return;
    }


    followMembersList.innerHTML =
        members
            .map(
                function (member) {

                    const name =
                        member.first_name ||
                        "Membre Recette Plus";


                    const avatar =
                        safeURL(
                            member.avatar_url,
                            ""
                        );


                    const initial =
                        name
                            .charAt(0)
                            .toUpperCase();


                    const isOwnProfile =
                        currentUser &&
                        currentUser.id ===
                            member.id;


                    const safeMemberId =
                        encodeURIComponent(
                            member.id || ""
                        );


                    return `

                        <div class="follow-member-row">

                            <a
                                href="./profil-communaute.html?id=${safeMemberId}"
                                class="follow-member"
                            >

                                ${
                                    avatar

                                        ? `

                                            <img
                                                src="${escapeHTML(avatar)}"
                                                alt="${escapeHTML(name)}"
                                                class="follow-member-avatar"
                                            >

                                          `

                                        : `

                                            <div
                                                class="follow-member-avatar-placeholder"
                                            >
                                                ${escapeHTML(initial)}
                                            </div>

                                          `
                                }


                                <span class="follow-member-name">

                                    ${escapeHTML(name)}

                                </span>

                            </a>


                            ${
                                isOwnProfile

                                    ? ""

                                    : `

                                        <button
                                            type="button"
                                            class="follow-list-button"
                                            data-user-id="${escapeHTML(member.id)}"
                                        >
                                            Suivre
                                        </button>

                                      `
                            }

                        </div>

                    `;

                }
            )
            .join("");


    setupFollowListButtons();

}


// ==========================================
// BOUTONS SUIVRE DANS LA LISTE
// ==========================================

async function setupFollowListButtons() {

    if (!currentUser) {
        return;
    }


    const buttons =
        document.querySelectorAll(
            ".follow-list-button"
        );


    for (const button of buttons) {

        const userId =
            button.dataset.userId;


        if (!userId) {
            continue;
        }


        const {
            data: existingFollow,
            error
        } =
            await supabaseClient
                .from("follows")
                .select("id")
                .eq(
                    "follower_id",
                    currentUser.id
                )
                .eq(
                    "following_id",
                    userId
                )
                .maybeSingle();


        if (error) {

            console.error(
                "Erreur vérification abonnement :",
                error
            );

            continue;
        }


        updateFollowListButton(
            button,
            !!existingFollow
        );


        button.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();

                event.stopPropagation();


                button.disabled =
                    true;


                const {
                    data: currentFollow,
                    error: checkError
                } =
                    await supabaseClient
                        .from("follows")
                        .select("id")
                        .eq(
                            "follower_id",
                            currentUser.id
                        )
                        .eq(
                            "following_id",
                            userId
                        )
                        .maybeSingle();


                if (checkError) {

                    console.error(
                        "Erreur suivi :",
                        checkError
                    );


                    button.disabled =
                        false;

                    return;
                }


                if (currentFollow) {

                    const {
                        error: deleteError
                    } =
                        await supabaseClient
                            .from("follows")
                            .delete()
                            .eq(
                                "id",
                                currentFollow.id
                            );


                    if (deleteError) {

                        console.error(
                            "Erreur désabonnement :",
                            deleteError
                        );


                        button.disabled =
                            false;

                        return;
                    }


                    updateFollowListButton(
                        button,
                        false
                    );

                } else {

                    const {
                        error: insertError
                    } =
                        await supabaseClient
                            .from("follows")
                            .insert({

                                follower_id:
                                    currentUser.id,

                                following_id:
                                    userId

                            });


                    if (insertError) {

                        console.error(
                            "Erreur abonnement :",
                            insertError
                        );


                        button.disabled =
                            false;

                        return;
                    }


                    updateFollowListButton(
                        button,
                        true
                    );

                }


                await loadFollowStats();


                button.disabled =
                    false;

            }
        );

    }

}


// ==========================================
// APPARENCE BOUTON DE LISTE
// ==========================================

function updateFollowListButton(
    button,
    isFollowing
) {

    if (!button) {
        return;
    }


    if (isFollowing) {

        button.textContent =
            "✓ Suivi";


        button.classList.add(
            "is-following"
        );

    } else {

        button.textContent =
            "Suivre";


        button.classList.remove(
            "is-following"
        );

    }

}


// ==========================================
// CHARGER LES ABONNÉS
// ==========================================

async function loadFollowers() {

    if (
        !profileId ||
        !followMembersList
    ) {
        return;
    }


    openFollowModal(
        "Abonnés"
    );


    followMembersList.innerHTML = `

        <p class="loading">
            Chargement...
        </p>

    `;


    const {
        data: follows,
        error
    } =
        await supabaseClient
            .from("follows")
            .select(`

                follower_id,

                profiles!follows_follower_id_fkey (
                    id,
                    first_name,
                    avatar_url
                )

            `)
            .eq(
                "following_id",
                profileId
            );


    if (error) {

        console.error(
            "Erreur chargement abonnés :",
            error
        );


        followMembersList.innerHTML = `

            <p>
                Impossible de charger les abonnés.
            </p>

        `;

        return;
    }


    const members =
        (follows || [])
            .map(
                function (follow) {

                    return follow.profiles;

                }
            )
            .filter(Boolean);


    displayFollowMembers(
        members
    );

}


// ==========================================
// CHARGER LES ABONNEMENTS
// ==========================================

async function loadFollowing() {

    if (
        !profileId ||
        !followMembersList
    ) {
        return;
    }


    openFollowModal(
        "Abonnements"
    );


    followMembersList.innerHTML = `

        <p class="loading">
            Chargement...
        </p>

    `;


    const {
        data: follows,
        error
    } =
        await supabaseClient
            .from("follows")
            .select(`

                following_id,

                profiles!follows_following_id_fkey (
                    id,
                    first_name,
                    avatar_url
                )

            `)
            .eq(
                "follower_id",
                profileId
            );


    if (error) {

        console.error(
            "Erreur chargement abonnements :",
            error
        );


        followMembersList.innerHTML = `

            <p>
                Impossible de charger les abonnements.
            </p>

        `;

        return;
    }


    const members =
        (follows || [])
            .map(
                function (follow) {

                    return follow.profiles;

                }
            )
            .filter(Boolean);


    displayFollowMembers(
        members
    );

}


// ==========================================
// CLIC SUR ABONNÉS
// ==========================================

if (followersButton) {

    followersButton.addEventListener(
        "click",
        loadFollowers
    );

}


// ==========================================
// CLIC SUR ABONNEMENTS
// ==========================================

if (followingButton) {

    followingButton.addEventListener(
        "click",
        loadFollowing
    );

}


// ==========================================
// FERMETURE CROIX
// ==========================================

if (closeFollowModal) {

    closeFollowModal.addEventListener(
        "click",
        closeFollowModalWindow
    );

}


// ==========================================
// FERMETURE SUR LE FOND
// ==========================================

if (followModalOverlay) {

    followModalOverlay.addEventListener(
        "click",
        closeFollowModalWindow
    );

}


// ==========================================
// FERMETURE TOUCHE ÉCHAP
// ==========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            closeFollowModalWindow();

        }

    }
);


// ==========================================
// LANCEMENT
// ==========================================

async function initPublicProfile() {

    await loadCurrentUser();

    await loadPublicProfile();

    await loadFollowStats();

    await setupFollowButton();

}


initPublicProfile();