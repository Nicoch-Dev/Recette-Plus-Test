const notificationsList =
    document.getElementById(
        "notificationsList"
    );

const markAllReadButton =
    document.getElementById(
        "markAllReadButton"
    );


let currentUser = null;


// ==========================================
// CHARGEMENT UTILISATEUR
// ==========================================

async function loadUser() {

    const {
        data: {
            user
        }
    } =
        await supabaseClient
            .auth
            .getUser();


    currentUser = user;

}


// ==========================================
// CHARGEMENT DES NOTIFICATIONS
// ==========================================

async function loadNotifications() {

    if (!currentUser) {
        return;
    }


    const {
        data: notifications,
        error
    } =
        await supabaseClient
            .from("notifications")
            .select(`
                id,
                user_id,
                actor_id,
                recipe_id,
                type,
                message,
                is_read,
                created_at,
                actor:profiles!notifications_actor_id_fkey (
                    first_name,
                    avatar_url
                ),
                recipe:recipes (
                    title
                )
            `)
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Erreur chargement notifications :",
            error
        );


        notificationsList.innerHTML = `

            <p>
                Impossible de charger les notifications.
            </p>

        `;

        return;
    }


    if (
        !notifications ||
        notifications.length === 0
    ) {

        notificationsList.innerHTML = `

            <div class="notifications-empty">

                <p>
                    Aucune notification pour le moment.
                </p>

            </div>

        `;

        return;
    }


    displayNotifications(
        notifications
    );

}


// ==========================================
// AFFICHAGE
// ==========================================

function displayNotifications(
    notifications
) {

    notificationsList.innerHTML =
        notifications
            .map(function (notification) {

                const actorName =
                    notification.actor?.first_name ||
                    "Un membre";


                const avatar =
                    notification.actor?.avatar_url;


                const recipeTitle =
                    notification.recipe?.title ||
                    "votre recette";


                const date =
                    new Date(
                        notification.created_at
                    )
                        .toLocaleString(
                            "fr-FR",
                            {
                                dateStyle:
                                    "short",

                                timeStyle:
                                    "short"
                            }
                        );


                let text = "";


                if (
                    notification.type ===
                    "new_recipe"
                ) {

                    text =
                        `${actorName} a publié une nouvelle recette : "${recipeTitle}"`;

                }


                if (
                    notification.type ===
                    "like"
                ) {

                    text =
                        `${actorName} a aimé "${recipeTitle}"`;

                }


                if (
                    notification.type ===
                    "comment"
                ) {

                    text =
                        `${actorName} a commenté "${recipeTitle}"`;

                }


                if (
                    notification.type ===
                    "follow"
                ) {

                    text =
                        `${actorName} vous suit maintenant`;

                }


                if (notification.type === "group_invitation") {
                    text = notification.message ||
                        `${actorName} vous invite à rejoindre un groupe privé.`;
                }


                if (notification.type === "group_removed") {
                    text = notification.message ||
                        "Vous avez été retiré d'un groupe privé.";
                }




                
                const notificationLink =
                    ["group_invitation", "group_removed"].includes(notification.type)
                        ? "./groupes.html"
                        : notification.type === "follow"
                            ? `./profil-communaute.html?id=${notification.actor_id}`
                            : `./recette-communaute.html?id=${notification.recipe_id}`;



                return `

                    <a
                        href="${notificationLink}"
                        class="
                            notification-item
                            ${
                                notification.is_read
                                    ? ""
                                    : "unread"
                            }
                        "
                        data-notification-id="${notification.id}"
                    >

                        ${
                            avatar

                                ? `
                                    <img
                                        src="${avatar}"
                                        alt=""
                                        class="notification-avatar"
                                    >
                                  `

                                : `
                                    <div class="notification-avatar-placeholder">
                                        ${
                                            actorName
                                                .charAt(0)
                                                .toUpperCase()
                                        }
                                    </div>
                                  `
                        }


                        <div class="notification-content">

                            <p>
                                ${text}
                            </p>

                            <span>
                                ${date}
                            </span>

                        </div>

                    </a>

                `;

            })
            .join("");


    setupNotificationClicks();

}


// ==========================================
// MARQUER UNE NOTIFICATION COMME LUE
// ==========================================

function setupNotificationClicks() {

    const items =
        document.querySelectorAll(
            ".notification-item"
        );


    items.forEach(
        function (item) {

            item.addEventListener(
                "click",
                async function () {

                    const id =
                        Number(
                            item.dataset
                                .notificationId
                        );


                    await supabaseClient
                        .from("notifications")
                        .update({
                            is_read: true
                        })
                        .eq(
                            "id",
                            id
                        );

                }
            );

        }
    );

}


// ==========================================
// TOUT MARQUER COMME LU
// ==========================================

if (markAllReadButton) {

    markAllReadButton.addEventListener(
        "click",
        async function () {

            if (!currentUser) {
                return;
            }


            const {
                error
            } =
                await supabaseClient
                    .from("notifications")
                    .update({
                        is_read: true
                    })
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .eq(
                        "is_read",
                        false
                    );


            if (error) {

                console.error(
                    "Erreur lecture notifications :",
                    error
                );

                return;
            }


            await loadNotifications();

            await loadNotificationCount();

        }
    );

}


// ==========================================
// LANCEMENT
// ==========================================

async function initNotifications() {

    await loadUser();

    await loadNotifications();

}


initNotifications();