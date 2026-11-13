
"use strict";


/* ==========================================
   GROUPES - ÉLÉMENTS HTML
========================================== */

const $ = (id) => {

    return document.getElementById(id);

};


const isGroupsPage = Boolean($("myGroups"));

if (isGroupsPage && !document.getElementById("groupPhotoCardStyles")) {
    const style = document.createElement("style");
    style.id = "groupPhotoCardStyles";
    style.textContent = `.groups-cover-image { display:block; width:100%; height:190px; object-fit:cover; border-radius:12px; margin-bottom:14px; } @media(max-width:600px) { .groups-cover-image { height:165px; } }`;
    document.head.append(style);
}

const isCreateGroupPage = Boolean($("createGroupForm"));


/* ==========================================
   GROUPES - MESSAGES
========================================== */

const status = (message, kind = "") => {

    const element = $("groupsStatus");

    if (!element) {

        return;

    }

    element.textContent = message;

    element.className = `groups-status ${kind}`;

};


/* ==========================================
   GROUPES - OUTILS HTML
========================================== */

function node(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {

        element.className = className;

    }

    if (text !== undefined) {

        element.textContent = text;

    }

    return element;

}


function clearWithMessage(container, message) {

    container.replaceChildren(

        node("p", "groups-empty", message)

    );

}


function makeButton(label, callback, secondary = false) {

    const button = node(

        "button",

        `groups-button${secondary ? " secondary" : ""}`,

        label

    );

    button.type = "button";


    button.addEventListener("click", async () => {

        button.disabled = true;

        try {

            await callback();

        } catch (error) {

            console.error(error);

            status(

                error.message || "Une erreur est survenue.",

                "error"

            );

        } finally {

            button.disabled = false;

        }

    });


    return button;

}


/* ==========================================
   GROUPES - UTILISATEUR
========================================== */

let userId = null;

let joinedIds = new Set();


/* ==========================================
   GROUPES - CHARGEMENT DES GROUPES
========================================== */

async function loadGroups() {

    const [

        {
            data: memberships,
            error: membershipError
        },

        {
            data: groups,
            error: groupsError
        }

    ] = await Promise.all([

        supabaseClient

            .from("community_group_members")

            .select("group_id")

            .eq("user_id", userId),


        supabaseClient

            .from("community_groups")

            .select(

                "id,name,description,is_private,image_url,created_at"

            )

            .order("created_at", {

                ascending: false

            })

    ]);


    if (membershipError) {

        throw membershipError;

    }

    if (groupsError) {

        throw groupsError;

    }


    joinedIds = new Set(

        (memberships || []).map((member) => {

            return member.group_id;

        })

    );


    const mine = $("myGroups");

    const discover = $("publicGroups");


    mine.replaceChildren();

    discover.replaceChildren();


    // Charger uniquement les compteurs des groupes publics.
    // La fonction Supabase ne divulgue aucune identité de membre.
    const publicGroups = (groups || []).filter((group) => !group.is_private);

    const counts = await Promise.all(
        publicGroups.map(async (group) => {
            const { data, error } = await supabaseClient.rpc(
                "get_public_group_member_count",
                { p_group_id: group.id }
            );

            if (error) {
                console.error("Compteur indisponible pour le groupe", group.id, error);
                return [group.id, null];
            }

            return [group.id, Number(data)];
        })
    );

    const memberCounts = new Map(counts);

    for (const group of groups || []) {

        const card = node("article", "groups-card");


        // Photo publique du groupe, si elle existe.
        if (!group.is_private && group.image_url) {

            const photo = node("img", "groups-cover-image");
            photo.src = group.image_url;
            photo.alt = `Photo du groupe ${group.name}`;
            photo.loading = "lazy";
            photo.addEventListener("error", () => photo.remove());
            card.append(photo);

        }

        card.append(

            node(

                "span",

                "groups-pill",

                group.is_private ? "🔒 Privé" : "🌍 Public"

            )

        );


        card.append(

            node("h3", "", group.name)

        );


        card.append(

            node(

                "p",

                "",

                group.description || "Groupe de discussion culinaire"

            )

        );


        if (!group.is_private) {

            const memberCount = memberCounts.get(group.id);

            card.append(
                node(
                    "p",
                    "groups-member-count",
                    memberCount === null || memberCount === undefined
                        ? "Nombre de membres indisponible"
                        : `${memberCount} ${memberCount === 1 ? "membre" : "membres"}`
                )
            );

        }


        if (joinedIds.has(group.id)) {

    card.append(

        node(

            "p",

            "",

            "✓ Vous êtes membre de ce groupe"

        )

    );


        /* ==========================================
        BOUTON - VOIR LE GROUPE
        ========================================== */

        const openGroupLink = node(

            "a",

            "groups-button",

            "Voir le groupe"

        );


        openGroupLink.href = `./groupe.html?id=${encodeURIComponent(group.id)}`;


        card.append(openGroupLink);


        mine.append(card);

        } else if (!group.is_private) {

            card.append(

                makeButton("Rejoindre", async () => {

                    const { error } = await supabaseClient.rpc(

                        "join_community_group",

                        {

                            p_group_id: group.id

                        }

                    );


                    if (error) {

                        throw error;

                    }


                    status(

                        "Vous avez rejoint le groupe.",

                        "success"

                    );


                    await loadGroups();

                })

            );


            discover.append(card);

        }

    }


    if (!mine.childElementCount) {

        clearWithMessage(

            mine,

            "Vous ne faites encore partie d’aucun groupe."

        );

    }


    if (!discover.childElementCount) {

        clearWithMessage(

            discover,

            "Aucun groupe public à découvrir pour le moment."

        );

    }

}


/* ==========================================
   GROUPES - INVITATIONS
========================================== */

async function loadInvitations() {

    const container = $("groupInvitations");


    const { data, error } = await supabaseClient.rpc(

        "get_my_community_group_invitations"

    );


    if (error) {

        throw error;

    }


    container.replaceChildren();


    for (const invitation of data || []) {

        const card = node(

            "article",

            "groups-card groups-invite"

        );


        const info = node("div");


        info.append(

            node("h3", "", invitation.group_name)

        );


        info.append(

            node(

                "p",

                "",

                `Invitation de ${invitation.inviter_name || "un membre Recette Plus"}`

            )

        );


        const actions = node(

            "div",

            "groups-invite-actions"

        );


        const respond = async (accept) => {

            const { error: responseError } = await supabaseClient.rpc(

                "respond_community_group_invitation",

                {

                    p_invitation_id: invitation.invitation_id,

                    p_accept: accept

                }

            );


            if (responseError) {

                throw responseError;

            }


            status(

                accept

                    ? "Invitation acceptée."

                    : "Invitation refusée.",

                "success"

            );


            await Promise.all([

                loadGroups(),

                loadInvitations()

            ]);

        };


        actions.append(

            makeButton(

                "Refuser",

                () => respond(false),

                true

            )

        );


        actions.append(

            makeButton(

                "Accepter",

                () => respond(true)

            )

        );


        card.append(info, actions);

        container.append(card);

    }


    if (!container.childElementCount) {

        clearWithMessage(

            container,

            "Aucune invitation en attente."

        );

    }

}


/* ==========================================
   PHOTOS - OPTIMISATION LOCALE (SANS IA)
========================================== */

async function optimizeGroupPhoto(file) {

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Choisissez une image JPEG, PNG ou WebP.");
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error("La photo d'origine ne doit pas dépasser 10 Mo.");
    }

    // Décodage et compression dans le navigateur : aucun service payant.
    const objectUrl = URL.createObjectURL(file);
    const picture = new Image();

    try {
        await new Promise((resolve, reject) => {
            picture.onload = resolve;
            picture.onerror = () => reject(new Error("Cette image ne peut pas être ouverte."));
            picture.src = objectUrl;
        });

        const width = picture.naturalWidth;
        const height = picture.naturalHeight;

        if (!width || !height) {
            throw new Error("Dimensions de photo invalides.");
        }

        const scale = Math.min(1, 1200 / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Compression de la photo indisponible.");

        context.drawImage(picture, 0, 0, canvas.width, canvas.height);

        const toBlob = (type, quality) => new Promise(resolve => {
            canvas.toBlob(resolve, type, quality);
        });

        let blob = await toBlob("image/webp", 0.82);
        let mime = "image/webp";
        let extension = "webp";

        // Repli pour les navigateurs qui ne savent pas encoder en WebP.
        if (!blob || blob.type !== "image/webp") {
            blob = await toBlob("image/jpeg", 0.82);
            mime = "image/jpeg";
            extension = "jpg";
        }

        if (!blob) throw new Error("Impossible de compresser la photo.");

        // Le bucket est limité à 10 Mo ; la sortie doit respecter cette limite.
        if (blob.size > 10 * 1024 * 1024) {
            throw new Error("La photo optimisée est trop volumineuse.");
        }

        return { blob, mime, extension };

    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}


/* ==========================================
   GROUPES - CRÉATION
========================================== */

async function createGroup(event) {

    event.preventDefault();


    const button = $("createGroupButton");

    button.disabled = true;


    try {

        const isPrivate = $("groupVisibility").value === "private";
        const photo = $("groupPhoto")?.files?.[0] || null;

        if (photo && isPrivate) {
            throw new Error("La photo personnalisée est réservée aux groupes publics.");
        }

        if (photo) {
            const formats = ["image/jpeg", "image/png", "image/webp"];

            if (!formats.includes(photo.type)) {
                throw new Error("Choisissez une image JPEG, PNG ou WebP.");
            }

            if (photo.size > 10 * 1024 * 1024) {
                throw new Error("La photo ne doit pas dépasser 10 Mo.");
            }
        }

        // Compresser AVANT de créer le groupe : une image invalide ne
        // doit pas laisser un groupe créé sans photo par accident.
        const optimizedPhoto = photo ? await optimizeGroupPhoto(photo) : null;

        const { data: groupId, error } = await supabaseClient.rpc(
            "create_community_group",
            {
                p_name: $("groupName").value.trim(),
                p_description: $("groupDescription").value.trim(),
                p_is_private: isPrivate
            }
        );

        if (error) {
            throw error;
        }

        // Le groupe est créé avant l'envoi de sa photo : c'est indispensable
        // pour que les règles Storage vérifient son créateur.
        let photoWarning = "";

        if (optimizedPhoto) {
            const filePath = `${groupId}/cover-${crypto.randomUUID()}.${optimizedPhoto.extension}`;

            const { error: uploadError } = await supabaseClient.storage
                .from("group-images")
                .upload(filePath, optimizedPhoto.blob, {
                    contentType: optimizedPhoto.mime,
                    upsert: false
                });

            if (uploadError) {
                console.error("Envoi de la photo impossible", uploadError);
                photoWarning = " La photo n'a pas pu être envoyée.";
            } else {
                const { data: urlData } = supabaseClient.storage
                    .from("group-images")
                    .getPublicUrl(filePath);

                const { error: updateError } = await supabaseClient
                    .from("community_groups")
                    .update({ image_url: urlData.publicUrl })
                    .eq("id", groupId)
                    .eq("created_by", userId)
                    .select("id");

                if (updateError) {
                    console.error("Enregistrement de la photo impossible", updateError);
                    photoWarning = " La photo a été envoyée, mais son adresse n'a pas pu être enregistrée.";
                }
            }
        }

        $("createGroupForm").reset();

        status(
            `Groupe créé ! Vous en êtes administrateur.${photoWarning}`,
            photoWarning ? "error" : "success"
        );

        /*
           Sur la future page de création,
           retour vers la liste des groupes.
        */

        if (!isGroupsPage && !photoWarning) {

            window.location.href = "./groupes.html";

            return;

        }


        /*
           Tant que le formulaire est encore
           sur la page Groupes, on conserve
           le fonctionnement actuel.
        */

        // Recharger la liste uniquement si ses conteneurs existent.
        // Sur creer-groupe.html, ils sont absents.
        if (isGroupsPage) {
            await loadGroups();
        }


    } catch (error) {

        console.error(error);


        status(

            `Création impossible : ${error.message}`,

            "error"

        );

    } finally {

        button.disabled = false;

    }

}


/* ==========================================
   GROUPES - INITIALISATION
========================================== */

async function initGroups() {

    try {

        const {

            data: { user },

            error

        } = await supabaseClient.auth.getUser();


        if (error) {

            throw error;

        }


        if (!user) {

            status(

                "Connectez-vous pour accéder aux groupes Recette Plus.",

                "error"

            );


            if (isCreateGroupPage) {

                $("createGroupForm").hidden = true;

            }


            return;

        }


        userId = user.id;


        /*
           Charger les groupes et invitations
           uniquement sur la page de liste.
        */

        if (isGroupsPage) {

            await Promise.all([

                loadGroups(),

                loadInvitations()

            ]);

        }


    } catch (error) {

        console.error(error);


        status(

            `Chargement impossible : ${error.message}`,

            "error"

        );

    }

}


/* ==========================================
   GROUPES - ÉVÉNEMENTS
========================================== */

if (isCreateGroupPage) {

    const photoInput = $("groupPhoto");
    const photoPreview = $("groupPhotoPreview");
    let previewUrl = null;

    const refreshPhotoField = () => {
        const isPrivate = $("groupVisibility").value === "private";
        photoInput.disabled = isPrivate;
        if (isPrivate) photoInput.value = "";
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        photoPreview.hidden = true;
        photoPreview.removeAttribute("src");
    };

    $("groupVisibility").addEventListener("change", refreshPhotoField);
    photoInput.addEventListener("change", () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        const photo = photoInput.files?.[0];
        if (photo) {
            previewUrl = URL.createObjectURL(photo);
            photoPreview.src = previewUrl;
            photoPreview.hidden = false;
        } else {
            photoPreview.hidden = true;
            photoPreview.removeAttribute("src");
        }
    });
    refreshPhotoField();

    $("createGroupForm").addEventListener(

        "submit",

        createGroup

    );

}


/* ==========================================
   GROUPES - DÉMARRAGE
========================================== */

initGroups();
