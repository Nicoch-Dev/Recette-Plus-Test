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

const communityRecipes =
    document.getElementById(
        "communityRecipes"
    );

const communitySearch =
    document.getElementById(
        "communitySearch"
    );

const communityCategory =
    document.getElementById(
        "communityCategory"
    );

const communitySort =
    document.getElementById(
        "communitySort"
    );

const allRecipesTab =
    document.getElementById(
        "allRecipesTab"
    );

const followingRecipesTab =
    document.getElementById(
        "followingRecipesTab"
    );

const feedTab =
    document.getElementById(
        "feedTab"
    );

const membersCount =
    document.getElementById(
        "membersCount"
    );

const onlineCount =
    document.getElementById(
        "onlineCount"
    );

const suggestedMembers =
    document.getElementById(
        "suggestedMembers"
    );


// ==========================================
// VARIABLES
// ==========================================

let allCommunityRecipes = [];

let followedUsers = [];

let communityView = "all";

let currentUser = null;

let presenceChannel = null;

let recipesRealtimeChannel = null;

let activityRealtimeChannel = null;


// ==========================================
// IMAGE PAR DÉFAUT
// ==========================================

function getCommunityDefaultImage(category) {

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
            "Erreur utilisateur :",
            error
        );

        currentUser = null;

        return;
    }


    currentUser =
        user || null;

}


// ==========================================
// NOMBRE TOTAL DE MEMBRES
// ==========================================

async function loadMembersCount() {

    if (!membersCount) {
        return;
    }


    const {
        count,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            );


    if (error) {

        console.error(
            "Erreur compteur membres :",
            error
        );

        return;
    }


    membersCount.textContent =
        count || 0;

}


// ==========================================
// MEMBRES SUIVIS
// ==========================================

async function loadFollowedUsers() {

    if (!currentUser) {

        followedUsers = [];

        return;
    }


    const {
        data: follows,
        error
    } =
        await supabaseClient
            .from("follows")
            .select(
                "following_id"
            )
            .eq(
                "follower_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "Erreur abonnements :",
            error
        );

        followedUsers = [];

        return;
    }


    followedUsers =
        (follows || [])
            .map(
                function (follow) {

                    return follow.following_id;

                }
            );

}


// ==========================================
// MEMBRES À DÉCOUVRIR
// ==========================================

async function loadSuggestedMembers() {

    if (
        !suggestedMembers ||
        !currentUser
    ) {
        return;
    }


    const {
        data: profiles,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`

                id,
                first_name,
                avatar_url,

                recipes!recipes_user_id_profiles_fkey (
                    id,
                    is_public
                )

            `);


    if (error) {

        console.error(
            "Erreur membres à découvrir :",
            error
        );


        suggestedMembers.innerHTML = `

            <p>
                Impossible de charger les membres.
            </p>

        `;

        return;
    }


    let members =
        (profiles || [])
            .filter(
                function (profile) {

                    return (
                        profile.id !==
                            currentUser.id &&

                        !followedUsers.includes(
                            profile.id
                        )
                    );

                }
            )
            .map(
                function (profile) {

                    const publicRecipes =
                        (
                            profile.recipes ||
                            []
                        )
                            .filter(
                                function (recipe) {

                                    return (
                                        recipe.is_public ===
                                        true
                                    );

                                }
                            );


                    return {

                        ...profile,

                        publicRecipeCount:
                            publicRecipes.length

                    };

                }
            );


    // Membres les plus actifs en premier
    members.sort(
        function (a, b) {

            return (
                b.publicRecipeCount -
                a.publicRecipeCount
            );

        }
    );


    // Maximum 4 propositions
    members =
        members.slice(
            0,
            4
        );


    displaySuggestedMembers(
        members
    );

}


// ==========================================
// AFFICHAGE MEMBRES À DÉCOUVRIR
// ==========================================

function displaySuggestedMembers(
    members
) {

    if (!suggestedMembers) {
        return;
    }


    if (
        !members ||
        members.length === 0
    ) {

        suggestedMembers.innerHTML = `

            <p class="suggested-members-empty">

                Aucun nouveau membre
                à découvrir pour le moment.

            </p>

        `;

        return;
    }


    suggestedMembers.innerHTML =
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


                    const memberId =
                        encodeURIComponent(
                            member.id
                        );


                    const recipeCount =
                        member.publicRecipeCount ||
                        0;


                    return `

                        <article
                            class="suggested-member-card"
                            data-member-id="${escapeHTML(member.id)}"
                        >

                            <a
                                href="./profil-communaute.html?id=${memberId}"
                                class="suggested-member-profile"
                            >

                                ${
                                    avatar

                                        ? `

                                            <img
                                                src="${escapeHTML(avatar)}"
                                                alt="${escapeHTML(name)}"
                                                class="suggested-member-avatar"
                                            >

                                          `

                                        : `

                                            <div
                                                class="suggested-member-avatar-placeholder"
                                            >
                                                ${escapeHTML(initial)}
                                            </div>

                                          `
                                }


                                <strong>
                                    ${escapeHTML(name)}
                                </strong>

                            </a>


                            <span class="suggested-member-recipes">

                                ${recipeCount}

                                ${
                                    recipeCount <= 1
                                        ? "recette"
                                        : "recettes"
                                }

                            </span>


                            <button
                                type="button"
                                class="suggested-follow-button"
                                data-user-id="${escapeHTML(member.id)}"
                            >
                                Suivre
                            </button>

                        </article>

                    `;

                }
            )
            .join("");


    setupSuggestedFollowButtons();

}


// ==========================================
// BOUTONS SUIVRE - SUGGESTIONS
// ==========================================

function setupSuggestedFollowButtons() {

    const buttons =
        document.querySelectorAll(
            ".suggested-follow-button"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                async function () {

                    if (!currentUser) {
                        return;
                    }


                    const userId =
                        button.dataset.userId;


                    if (!userId) {
                        return;
                    }


                    button.disabled =
                        true;


                    const {
                        error
                    } =
                        await supabaseClient
                            .from("follows")
                            .insert({

                                follower_id:
                                    currentUser.id,

                                following_id:
                                    userId

                            });


                    if (error) {

                        console.error(
                            "Erreur abonnement :",
                            error
                        );


                        button.disabled =
                            false;


                        return;
                    }


                    if (
                        !followedUsers.includes(
                            userId
                        )
                    ) {

                        followedUsers.push(
                            userId
                        );

                    }


                    const card =
                        button.closest(
                            ".suggested-member-card"
                        );


                    if (card) {

                        card.remove();

                    }


                    // Met à jour les onglets abonnements / fil
                    filterCommunityRecipes();


                    // Recharge les suggestions
                    await loadSuggestedMembers();

                }
            );

        }
    );

}


// ==========================================
// PRÉSENCE EN LIGNE
// ==========================================

async function setupCommunityPresence() {

    if (
        !onlineCount ||
        !currentUser
    ) {
        return;
    }


    presenceChannel =
        supabaseClient.channel(
            "community-presence",
            {
                config: {

                    presence: {

                        key:
                            currentUser.id

                    }

                }
            }
        );


    presenceChannel.on(
        "presence",
        {
            event: "sync"
        },
        function () {

            const state =
                presenceChannel
                    .presenceState();


            const onlineUsers =
                Object.keys(
                    state
                ).length;


            onlineCount.textContent =
                onlineUsers;

        }
    );


    presenceChannel.subscribe(
        async function (status) {

            if (
                status ===
                "SUBSCRIBED"
            ) {

                await presenceChannel
                    .track({

                        user_id:
                            currentUser.id,

                        online_at:
                            new Date()
                                .toISOString()

                    });

            }

        }
    );

}


// ==========================================
// CHARGEMENT DES RECETTES PUBLIQUES
// ==========================================

async function loadCommunityRecipes() {

    if (!communityRecipes) {
        return;
    }


    const {
        data: recipes,
        error
    } =
        await supabaseClient
            .from("recipes")
            .select(`

                *,

                profiles!recipes_user_id_profiles_fkey (
                    first_name,
                    avatar_url
                ),

                recipe_likes (
                    id
                ),

                comments (
                    id
                )

            `)
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


    if (error) {

        console.error(
            "Erreur communauté :",
            error
        );


        communityRecipes.innerHTML = `

            <p class="recipe-error">

                Impossible de charger
                les recettes de la communauté.

            </p>

        `;

        return;
    }


    allCommunityRecipes =
        recipes || [];


    filterCommunityRecipes();

}


// ==========================================
// FILTRAGE + TRI
// ==========================================

function filterCommunityRecipes() {

    let filteredRecipes =
        [...allCommunityRecipes];


    const searchValue =
        communitySearch

            ? communitySearch
                .value
                .toLowerCase()
                .trim()

            : "";


    if (searchValue) {

        filteredRecipes =
            filteredRecipes.filter(
                function (recipe) {

                    const title =
                        (recipe.title || "")
                            .toLowerCase();


                    const description =
                        (recipe.description || "")
                            .toLowerCase();


                    const author =
                        (
                            recipe.profiles
                                ?.first_name ||
                            ""
                        )
                            .toLowerCase();


                    return (

                        title.includes(
                            searchValue
                        ) ||

                        description.includes(
                            searchValue
                        ) ||

                        author.includes(
                            searchValue
                        )

                    );

                }
            );

    }


    const categoryValue =
        communityCategory

            ? communityCategory
                .value
                .toLowerCase()
                .trim()

            : "";


    if (categoryValue) {

        filteredRecipes =
            filteredRecipes.filter(
                function (recipe) {

                    const category =
                        (recipe.category || "")
                            .toLowerCase();


                    return category.includes(
                        categoryValue
                    );

                }
            );

    }


    if (
        communityView === "following" ||
        communityView === "feed"
    ) {

        filteredRecipes =
            filteredRecipes.filter(
                function (recipe) {

                    return followedUsers
                        .includes(
                            recipe.user_id
                        );

                }
            );

    }


    if (
        communityView === "feed"
    ) {

        filteredRecipes.sort(
            function (a, b) {

                return (
                    new Date(
                        b.created_at
                    ) -

                    new Date(
                        a.created_at
                    )
                );

            }
        );


        displayCommunityRecipes(
            filteredRecipes
        );


        return;

    }


    const sortValue =
        communitySort

            ? communitySort.value

            : "recent";


    if (
        sortValue === "recent"
    ) {

        filteredRecipes.sort(
            function (a, b) {

                return (
                    new Date(
                        b.created_at
                    ) -

                    new Date(
                        a.created_at
                    )
                );

            }
        );

    }


    if (
        sortValue === "likes"
    ) {

        filteredRecipes.sort(
            function (a, b) {

                return (
                    (
                        b.recipe_likes
                            ?.length || 0
                    ) -

                    (
                        a.recipe_likes
                            ?.length || 0
                    )
                );

            }
        );

    }


    if (
        sortValue === "comments"
    ) {

        filteredRecipes.sort(
            function (a, b) {

                return (
                    (
                        b.comments
                            ?.length || 0
                    ) -

                    (
                        a.comments
                            ?.length || 0
                    )
                );

            }
        );

    }


    displayCommunityRecipes(
        filteredRecipes
    );

}


// ==========================================
// AFFICHAGE DES RECETTES
// ==========================================

function displayCommunityRecipes(
    recipes
) {

    if (!communityRecipes) {
        return;
    }


    if (
        !recipes ||
        recipes.length === 0
    ) {

        let title =
            "Aucune recette trouvée.";

        let message =
            "Aucune recette ne correspond à votre sélection.";


        if (
            communityView ===
            "following"
        ) {

            title =
                "Aucune recette publiée par vos abonnements.";

            message =
                "Suivez d'autres membres pour découvrir leurs recettes.";

        }


        if (
            communityView ===
            "feed"
        ) {

            title =
                "Votre fil d'actualité est vide pour le moment.";

            message =
                "Les nouvelles recettes des membres que vous suivez apparaîtront ici.";

        }


        communityRecipes.innerHTML = `

            <div class="community-empty">

                <h2>
                    ${escapeHTML(title)}
                </h2>

                <p>
                    ${escapeHTML(message)}
                </p>

            </div>

        `;

        return;
    }


    communityRecipes.innerHTML =
        recipes
            .map(
                function (recipe) {

                    const defaultImage =
                        getCommunityDefaultImage(
                            recipe.category
                        );


                    const image =
                        safeURL(
                            recipe.image,
                            defaultImage
                        );


                    const firstName =
                        recipe.profiles
                            ?.first_name ||

                        "Membre Recette Plus";


                    const avatar =
                        safeURL(
                            recipe.profiles
                                ?.avatar_url,
                            ""
                        );


                    const likes =
                        recipe.recipe_likes
                            ?.length || 0;


                    const comments =
                        recipe.comments
                            ?.length || 0;


                    const safeRecipeId =
                        Number(
                            recipe.id
                        );


                    const safeUserId =
                        encodeURIComponent(
                            recipe.user_id || ""
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


                                <div
                                    class="community-card-author"
                                >

                                    ${
                                        avatar

                                            ? `

                                                <img
                                                    src="${escapeHTML(avatar)}"
                                                    alt=""
                                                    class="community-card-avatar"
                                                >

                                              `

                                            : `

                                                <div
                                                    class="community-card-avatar-placeholder"
                                                >
                                                    ${
                                                        escapeHTML(
                                                            firstName
                                                                .charAt(0)
                                                                .toUpperCase()
                                                        )
                                                    }
                                                </div>

                                              `
                                    }


                                    <p>

                                        Recette publiée par

                                        <a
                                            href="./profil-communaute.html?id=${safeUserId}"
                                            class="community-author-link"
                                        >

                                            ${escapeHTML(firstName)}

                                        </a>

                                    </p>

                                </div>


                                ${
                                    recipe.description

                                        ? `

                                            <p
                                                class="community-card-description"
                                            >

                                                ${
                                                    escapeHTML(
                                                        recipe.description
                                                    )
                                                }

                                            </p>

                                          `

                                        : ""
                                }


                                <div
                                    class="community-card-meta"
                                >

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
                                                    👥 ${escapeHTML(recipe.servings)}
                                                </span>

                                              `

                                            : ""
                                    }

                                </div>


                                <div
                                    class="community-card-stats"
                                >

                                    <span>
                                        ♥ ${likes}
                                    </span>

                                    <span>
                                        💬 ${comments}
                                    </span>

                                </div>


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
// CHANGER D'ONGLET
// ==========================================

function setCommunityView(view) {

    communityView =
        view;


    allRecipesTab
        ?.classList
        .toggle(
            "active",
            view === "all"
        );


    followingRecipesTab
        ?.classList
        .toggle(
            "active",
            view === "following"
        );


    feedTab
        ?.classList
        .toggle(
            "active",
            view === "feed"
        );


    filterCommunityRecipes();

}


// ==========================================
// ÉVÉNEMENTS
// ==========================================

communitySearch
    ?.addEventListener(
        "input",
        filterCommunityRecipes
    );


communityCategory
    ?.addEventListener(
        "change",
        filterCommunityRecipes
    );


communitySort
    ?.addEventListener(
        "change",
        filterCommunityRecipes
    );


allRecipesTab
    ?.addEventListener(
        "click",
        function () {

            setCommunityView(
                "all"
            );

        }
    );


followingRecipesTab
    ?.addEventListener(
        "click",
        function () {

            setCommunityView(
                "following"
            );

        }
    );


feedTab
    ?.addEventListener(
        "click",
        function () {

            setCommunityView(
                "feed"
            );

        }
    );


// ==========================================
// TEMPS RÉEL - RECETTES
// ==========================================

function setupRealtimeCommunityRecipes() {

    recipesRealtimeChannel =
        supabaseClient
            .channel(
                "community-recipes-live"
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "recipes"
                },
                async function (payload) {

                    const newRecipe =
                        payload.new;

                    const oldRecipe =
                        payload.old;


                    if (
                        newRecipe?.is_public === true ||
                        oldRecipe?.is_public === true
                    ) {

                        await loadCommunityRecipes();

                        await loadSuggestedMembers();

                    }

                }
            )
            .subscribe();

}


// ==========================================
// TEMPS RÉEL - LIKES / COMMENTAIRES
// ==========================================

function setupRealtimeCommunityActivity() {

    activityRealtimeChannel =
        supabaseClient
            .channel(
                "community-activity-live"
            )

            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "recipe_likes"
                },
                async function () {

                    await loadCommunityRecipes();

                }
            )

            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "comments"
                },
                async function () {

                    await loadCommunityRecipes();

                }
            )

            .subscribe();

}


// ==========================================
// NETTOYAGE
// ==========================================

window.addEventListener(
    "beforeunload",
    function () {

        if (presenceChannel) {

            supabaseClient
                .removeChannel(
                    presenceChannel
                );

        }


        if (recipesRealtimeChannel) {

            supabaseClient
                .removeChannel(
                    recipesRealtimeChannel
                );

        }


        if (activityRealtimeChannel) {

            supabaseClient
                .removeChannel(
                    activityRealtimeChannel
                );

        }

    }
);


// ==========================================
// LANCEMENT
// ==========================================

async function initCommunity() {

    await loadCurrentUser();

    await loadFollowedUsers();

    await loadMembersCount();

    await loadSuggestedMembers();

    await loadCommunityRecipes();

    await setupCommunityPresence();

    setupRealtimeCommunityRecipes();

    setupRealtimeCommunityActivity();

}


initCommunity();