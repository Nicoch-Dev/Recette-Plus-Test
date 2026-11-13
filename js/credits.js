const buy20Button = document.getElementById("buy-20");

buy20Button.addEventListener("click", async () => {

    try {

        buy20Button.disabled = true;
        buy20Button.textContent = "Chargement...";

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            alert("Vous devez être connecté.");
            return;
        }

        const { data, error } =
            await supabaseClient.functions.invoke(
                "create-checkout",
                {
                    body: {
                        pack: "20"
                    }
                }
            );

        if (error) {
            throw error;
        }

        if (!data?.url) {
            throw new Error(
                "Aucune URL de paiement reçue."
            );
        }

        window.location.href = data.url;

    } catch (error) {

        console.error(
            "Erreur création paiement Stripe :",
            error
        );

        alert(
            "Impossible de lancer le paiement."
        );

        buy20Button.disabled = false;
        buy20Button.textContent =
            "Acheter 20 crédits";
    }

});

const buy50Button = document.getElementById("buy-50");

buy50Button.addEventListener("click", async () => {

    try {

        buy50Button.disabled = true;
        buy50Button.textContent = "Chargement...";

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            alert("Vous devez être connecté.");
            return;
        }

        const { data, error } =
            await supabaseClient.functions.invoke(
                "create-checkout",
                {
                    body: {
                        pack: "50"
                    }
                }
            );

        if (error) {
            throw error;
        }

        if (!data?.url) {
            throw new Error(
                "Aucune URL de paiement reçue."
            );
        }

        window.location.href = data.url;

    } catch (error) {

        console.error(
            "Erreur création paiement Stripe :",
            error
        );

        alert(
            "Impossible de lancer le paiement."
        );

        buy50Button.disabled = false;
        buy50Button.textContent =
            "Acheter 50 crédits";
    }

});