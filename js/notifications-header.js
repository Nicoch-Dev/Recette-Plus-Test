const notificationBadge =
    document.getElementById(
        "notificationBadge"
    );

let notificationChannel = null;


// ==========================================
// COMPTER LES NOTIFICATIONS NON LUES
// ==========================================

async function loadNotificationCount() {

    if (!notificationBadge) {
        return;
    }


    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();


    if (
        userError ||
        !user
    ) {

        notificationBadge.style.display =
            "none";

        return;
    }


    const {
        count,
        error
    } =
        await supabaseClient
            .from("notifications")
            .select(
                "*",
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
                "is_read",
                false
            );


    if (error) {

        console.error(
            "Erreur compteur notifications :",
            error
        );

        return;
    }


    updateNotificationBadge(
        count || 0
    );

}


// ==========================================
// AFFICHAGE DU COMPTEUR
// ==========================================

function updateNotificationBadge(count) {

    if (!notificationBadge) {
        return;
    }


    if (count === 0) {

        notificationBadge.style.display =
            "none";

        notificationBadge.textContent =
            "0";

        return;
    }


    notificationBadge.style.display =
        "flex";


    notificationBadge.textContent =
        count > 99
            ? "99+"
            : count;

}


// ==========================================
// NOTIFICATIONS EN TEMPS RÉEL
// ==========================================

async function setupRealtimeNotifications() {

    const {
        data: {
            user
        },
        error
    } =
        await supabaseClient
            .auth
            .getUser();


    if (
        error ||
        !user
    ) {
        return;
    }


    notificationChannel =
        supabaseClient
            .channel(
                `notifications-${user.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter:
                        `user_id=eq.${user.id}`
                },
                function () {

                    loadNotificationCount();

                }
            )
            .subscribe();

}


// ==========================================
// LANCEMENT
// ==========================================

async function initNotificationHeader() {

    await loadNotificationCount();

    await setupRealtimeNotifications();

}


initNotificationHeader();