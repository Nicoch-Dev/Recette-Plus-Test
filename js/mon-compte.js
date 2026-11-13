// ==========================================
// ÉLÉMENTS DE LA PAGE
// ==========================================

const profileForm =
    document.getElementById("profileForm");

const accountName =
    document.getElementById("accountName");

const accountEmail =
    document.getElementById("accountEmail");

const profileBio =
    document.getElementById("profileBio");

const recipeCount =
    document.getElementById("recipeCount");

const accountLogoutButton =
    document.getElementById(
        "accountLogoutButton"
    );

const headerUserName =
    document.getElementById("userName");

const profileAvatar =
    document.getElementById(
        "profileAvatar"
    );

const avatarPreview =
    document.getElementById(
        "avatarPreview"
    );

const inviteFriendButton =
    document.getElementById(
        "inviteFriendButton"
    );

const inviteMessage =
    document.getElementById(
        "inviteMessage"
    );    


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;

let currentProfile = null;


// ==========================================
// CHARGEMENT DU COMPTE
// ==========================================

async function loadAccount() {

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

        console.error(
            "Utilisateur non connecté :",
            userError
        );


        window.location.href =
            "./connexion.html";

        return;
    }


    currentUser = user;


    // ======================================
    // EMAIL
    // ======================================

    if (accountEmail) {

        accountEmail.value =
            user.email || "";

    }


    // ======================================
    // PROFIL SUPABASE
    // ======================================

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                first_name,
                bio,
                avatar_url
            `)
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (profileError) {

        console.error(
            "Erreur chargement profil :",
            profileError
        );

    }


    currentProfile =
        profile || null;


    // ======================================
    // PRÉNOM
    // ======================================

    const firstName =
        profile?.first_name ||
        user.user_metadata?.first_name ||
        "";


    if (accountName) {

        accountName.value =
            firstName;

    }


    // ======================================
    // BIO
    // ======================================

    if (profileBio) {

        profileBio.value =
            profile?.bio || "";

    }


    // ======================================
    // PHOTO DE PROFIL
    // ======================================

    if (
        avatarPreview &&
        profile?.avatar_url
    ) {

        avatarPreview.src =
            profile.avatar_url;

        avatarPreview.style.display =
            "block";

    }


    // ======================================
    // HEADER
    // ======================================

    if (
        headerUserName &&
        firstName
    ) {

        headerUserName.textContent =
            `Bonjour ${firstName}`;

    }


    // ======================================
    // NOMBRE DE RECETTES
    // ======================================

    await loadRecipeCount(
        user.id
    );

    await loadRecipeLimit(user.id);


    // ======================================
    // CRÉDITS ET UTILISATION
    // ======================================

    await loadUsage();

    // ======================================
    // PARRAINAGE
    // ======================================

    const referralCredits =
        await loadReferralCredits();

    const referralCreditsElement =
        document.getElementById(
            "referralCredits"
        );

    if (referralCreditsElement) {

        referralCreditsElement.textContent =
            referralCredits;


        if (referralCredits >= 5) {

            const referralText =
                referralCreditsElement
                    .nextElementSibling;

            if (referralText) {

                referralText.textContent =
                    "/ 5 crédits gagnés — maximum atteint";

            }

        }

    }

}


// ==========================================
// NOMBRE DE RECETTES
// ==========================================

async function loadRecipeCount(userId) {

    if (!recipeCount) {
        return;
    }


    const {
        count,
        error
    } =
        await supabaseClient
            .from("recipes")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "user_id",
                userId
            );


    if (error) {

        console.error(
            "Erreur compteur recettes :",
            error
        );

        return;
    }


    recipeCount.textContent =
        count || 0;

}

// ==========================================
// CAPACITÉ DU CARNET DE RECETTES
// ==========================================

async function loadRecipeLimit(userId) {

    const label = document.getElementById("recipeLimitLabel");

    if (!label) return;

    const [profileResult, billingResult] = await Promise.all([
        supabaseClient
            .from("profiles")
            .select("is_test_account")
            .eq("id", userId)
            .single(),

        supabaseClient
            .from("user_billing")
            .select("plan, has_purchased_pack")
            .eq("user_id", userId)
            .single()
    ]);

    if (profileResult.error || billingResult.error) {
        console.error(
            "Impossible de charger la limite du carnet :",
            profileResult.error,
            billingResult.error
        );
        return;
    }

    const isTest = profileResult.data.is_test_account === true;
    const isPremium = billingResult.data.plan === "premium";
    const hasPack = billingResult.data.has_purchased_pack === true;

    if (isTest || isPremium) {

        label.textContent =
            "recettes enregistrées — carnet illimité";

    } else {

        const limit = hasPack ? 30 : 10;

        label.textContent =
            `recettes enregistrées sur ${limit}`;
    }
}


// ==========================================
// APERÇU DE LA PHOTO
// ==========================================

if (profileAvatar) {

    profileAvatar.addEventListener(
        "change",
        function () {

            const file =
                profileAvatar.files[0];


            if (!file) {
                return;
            }


            const previewUrl =
                URL.createObjectURL(
                    file
                );


            if (avatarPreview) {

                avatarPreview.src =
                    previewUrl;

                avatarPreview.style.display =
                    "block";

            }

        }
    );

}


// ==========================================
// MODIFICATION DU PROFIL
// ==========================================

if (profileForm) {

    profileForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!currentUser) {
                return;
            }


            const firstName =
                accountName
                    ? accountName.value.trim()
                    : "";


            const bio =
                profileBio
                    ? profileBio.value.trim()
                    : "";


            if (!firstName) {

                alert(
                    "Veuillez renseigner votre prénom."
                );

                return;
            }


            // ==================================
            // PHOTO ACTUELLE
            // ==================================

            let avatarUrl =
                currentProfile?.avatar_url ||
                null;


            const avatarFile =
                profileAvatar?.files[0];


            // ==================================
            // NOUVELLE PHOTO
            // ==================================

            if (avatarFile) {

                const fileExtension =
                    avatarFile.name
                        .split(".")
                        .pop();


                const fileName =
                    `${currentUser.id}-${Date.now()}.${fileExtension}`;


                const filePath =
                    `profiles/${fileName}`;


                const {
                    error: uploadError
                } =
                    await supabaseClient
                        .storage
                        .from("avatars")
                        .upload(
                            filePath,
                            avatarFile
                        );


                if (uploadError) {

                    console.error(
                        "Erreur upload avatar :",
                        uploadError
                    );


                    alert(
                        "Impossible d'envoyer la photo de profil."
                    );

                    return;
                }


                const {
                    data: publicUrlData
                } =
                    supabaseClient
                        .storage
                        .from("avatars")
                        .getPublicUrl(
                            filePath
                        );


                avatarUrl =
                    publicUrlData.publicUrl;

            }


            // ==================================
            // MISE À JOUR AUTH
            // ==================================

            const {
                error: authError
            } =
                await supabaseClient
                    .auth
                    .updateUser({

                        data: {

                            first_name:
                                firstName

                        }

                    });


            if (authError) {

                console.error(
                    "Erreur mise à jour utilisateur :",
                    authError
                );


                alert(
                    "Impossible de modifier le profil."
                );

                return;
            }


            // ==================================
            // MISE À JOUR PROFILES
            // ==================================

            const {
                data: updatedProfile,
                error: profileUpdateError
            } =
                await supabaseClient
                    .from("profiles")
                    .upsert({

                        id:
                            currentUser.id,

                        first_name:
                            firstName,

                        bio:
                            bio,

                        avatar_url:
                            avatarUrl,

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .select()
                    .single();


            if (profileUpdateError) {

                console.error(
                    "Erreur mise à jour profil :",
                    profileUpdateError
                );


                alert(
                    "Le profil n'a pas pu être enregistré."
                );

                return;
            }


            currentProfile =
                updatedProfile;


            // ==================================
            // ACTUALISER L'APERÇU
            // ==================================

            if (
                avatarPreview &&
                avatarUrl
            ) {

                avatarPreview.src =
                    avatarUrl;

                avatarPreview.style.display =
                    "block";

            }


            // ==================================
            // ACTUALISER LE HEADER
            // ==================================

            if (headerUserName) {

                headerUserName.textContent =
                    `Bonjour ${firstName}`;

            }


            // Vider le champ fichier

            if (profileAvatar) {

                profileAvatar.value =
                    "";

            }


            alert(
                "Profil enregistré ✓"
            );

        }
    );

}

// ==========================================
// INVITER UN PROCHE
// ==========================================

let invitationLinkToShare = null;


if (inviteFriendButton) {

    inviteFriendButton.addEventListener(
        "click",
        async function () {

            // ======================================
            // INVITATION DÉJÀ CRÉÉE :
            // PARTAGER IMMÉDIATEMENT
            // ======================================

            if (invitationLinkToShare) {

                const inviterName =
                    currentProfile?.first_name ||
                    "Un proche";

                const shareText =
                    `${inviterName} vous invite à rejoindre Recette Plus 🍴\n\n` +
                    `Partagez vos recettes et cuisinez ensemble !`;


                if (navigator.share) {

                    try {

                        await navigator.share({
                            title:
                                "Invitation Recette Plus",

                            text:
                                shareText,

                            url:
                                invitationLinkToShare
                        });


                        if (inviteMessage) {

                            inviteMessage.textContent =
                                "Invitation partagée ✓";

                        }

                    } catch (shareError) {

                        if (
                            shareError.name !==
                            "AbortError"
                        ) {

                            console.error(
                                "Erreur partage :",
                                shareError
                            );

                            if (inviteMessage) {

                                inviteMessage.textContent =
                                    invitationLinkToShare;

                            }

                        }

                    }

                } else {

                    try {

                        await navigator.clipboard.writeText(
                            invitationLinkToShare
                        );


                        if (inviteMessage) {

                            inviteMessage.textContent =
                                "Lien d'invitation copié ✓";

                        }

                    } catch (copyError) {

                        console.error(
                            "Erreur copie :",
                            copyError
                        );


                        if (inviteMessage) {

                            inviteMessage.textContent =
                                invitationLinkToShare;

                        }

                    }

                }


                return;
            }


            // ======================================
            // CRÉER UNE NOUVELLE INVITATION
            // ======================================

            if (!currentUser) {
                return;
            }


            inviteFriendButton.disabled =
                true;

            inviteFriendButton.textContent =
                "Création de l'invitation...";


            if (inviteMessage) {

                inviteMessage.textContent =
                    "";

            }


            try {

                const {
                    data: invitation,
                    error
                } =
                    await supabaseClient
                        .from("invitations")
                        .insert({

                            inviter_id:
                                currentUser.id

                        })
                        .select(
                            "token, expires_at"
                        )
                        .single();


                if (error) {

                    console.error(
                        "Erreur création invitation :",
                        error
                    );


                    if (inviteMessage) {

                        inviteMessage.textContent =
                            "Impossible de créer l'invitation.";

                    }


                    return;
                }


                // ==================================
                // CONSTRUIRE LE LIEN
                // ==================================

                const invitationUrl =
                    new URL(
                        "./invitation.html",
                        window.location.href
                    );


                invitationUrl.searchParams.set(
                    "token",
                    invitation.token
                );


                invitationLinkToShare =
                    invitationUrl.toString();


                console.log(
                    "Lien d'invitation :",
                    invitationLinkToShare
                );


                // ==================================
                // PRÊT À PARTAGER
                // ==================================

                if (inviteMessage) {

                    inviteMessage.textContent =
                        "Invitation créée ✓ Cliquez maintenant sur Partager.";

                }


                inviteFriendButton.textContent =
                    "📤 Partager l'invitation";


            } catch (error) {

                console.error(
                    "Erreur invitation :",
                    error
                );


                if (inviteMessage) {

                    inviteMessage.textContent =
                        "Impossible de créer l'invitation.";

                }

            } finally {

                inviteFriendButton.disabled =
                    false;


                if (!invitationLinkToShare) {

                    inviteFriendButton.textContent =
                        "👥 Inviter un proche";

                }

            }

        }
    );

}


// ==========================================
// DÉCONNEXION
// ==========================================

if (accountLogoutButton) {

    accountLogoutButton.addEventListener(
        "click",
        async function () {

            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();


            if (error) {

                console.error(
                    "Erreur déconnexion :",
                    error
                );


                alert(
                    "Impossible de vous déconnecter."
                );

                return;
            }


            window.location.href =
                "../index.html";

        }
    );

}

// ==========================================
// CRÉDITS DE PARRAINAGE
// ==========================================

async function loadReferralCredits() {

    if (!currentUser) {
        return 0;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("ai_credit_ledger")
            .select("amount")
            .eq(
                "user_id",
                currentUser.id
            )
            .eq(
                "reason",
                "referral"
            );


    if (error) {

        console.error(
            "Erreur crédits de parrainage :",
            error
        );

        return 0;
    }


    const referralCredits =
        (data || []).reduce(
            (total, row) =>
                total + (row.amount || 0),
            0
        );


    return Math.min(
        referralCredits,
        5
    );

}


// ==========================================
// CRÉDITS ET UTILISATION
// ==========================================

async function loadUsage() {

    const aiCreditsElement =
        document.getElementById(
            "aiCreditsRemaining"
        );

    const searchesElement =
        document.getElementById(
            "searchesRemaining"
        );

    const aiCreditsLabel =
    document.getElementById("aiCreditsLabel");

    const searchesLabel =
    document.getElementById("searchesLabel");


    if (
        !aiCreditsElement ||
        !searchesElement
    ) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .functions
                .invoke(
                    "get-usage"
                );


        if (error) {

            console.error(
                "Erreur get-usage :",
                error
            );

            return;
        }


        if (!data) {
            return;
        }


        if (data.isTestAccount) {

            aiCreditsElement.textContent =
                "∞";

            searchesElement.textContent =
                "∞";

            aiCreditsLabel.textContent =
                "Compte test — accès illimité";

            searchesLabel.textContent =
                "Compte test — accès illimité";    

        } else {

                aiCreditsElement.textContent =
                    data.ai?.remaining ?? 0;

                aiCreditsLabel.textContent =
                    "crédits IA disponibles";

                searchesElement.textContent =
                    data.searches?.remaining ?? 0;

            }


    } catch (error) {

        console.error(
            "Erreur chargement utilisation :",
            error
        );

    }

}


// ==========================================
// LANCEMENT
// ==========================================

loadAccount();