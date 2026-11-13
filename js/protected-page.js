async function protectPage() {

    const {
        data: {
            user
        }
    } =
        await supabaseClient
            .auth
            .getUser();


    if (!user) {

       const currentPage =
            window.location.pathname.split("/").pop();

        window.location.href =
            `./connexion.html?redirect=${encodeURIComponent(currentPage)}`;

    }

}


protectPage();