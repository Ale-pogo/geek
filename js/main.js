document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("gatitos-container");

    // Cargar y mostrar las cards de gatitos al cargar la página
    fetch("https://673d38820118dbfe86068b3b.mockapi.io/:endpoint")
        .then(response => response.json())
        .then(gatitos => {
            renderGatitos(gatitos);

            // Filtrar cards
            const searchInput = document.getElementById("search-input");
            searchInput.addEventListener("input", () => {
                const query = searchInput.value.toLowerCase();
                const filteredGatitos = gatitos.filter(gatito =>
                    gatito.nombre.toLowerCase().includes(query) ||
                    gatito.datos.toLowerCase().includes(query)
                );
                renderGatitos(filteredGatitos);
            });
        })
        .catch(error => console.error("Error al cargar los gatitos:", error));

    // Función para renderizar las cards de los gatitos
    function renderGatitos(gatitos) {
        container.innerHTML = ""; // Limpia el contenedor antes de renderizar
        gatitos.forEach(gatito => {
            const card = document.createElement("div");
            card.classList.add("card");

            card.innerHTML = `
                <img src="${gatito.foto}" alt="${gatito.nombre}" class="gatito-foto">
                <h2>${gatito.nombre}</h2>
                <p>${gatito.datos}</p>
                <p><strong>Tiempo:</strong> ${gatito.tiempo}</p>
                <p><strong>Contacto:</strong> 
                    <a href="https://wa.me/${gatito.contacto}" target="_blank">
                        <img src="assets/whatsapp.svg" alt="WhatsApp" class="icon whatsapp-icon">
                    </a>
                </p>
                <button class="delete-button">
                    <img src="assets/trash.svg" alt="Eliminar" class="icon trash-icon">
                </button>
            `;

            // Añadir evento para eliminar la card
            card.querySelector(".delete-button").addEventListener("click", () => {
                deleteGatito(gatito.id, card);
            });

            container.appendChild(card);
        });
    }

    // Función para eliminar un gatito
    function deleteGatito(id, cardElement) {
        fetch(`https://673d38820118dbfe86068b3b.mockapi.io/:endpoint${id}`, {
            method: "DELETE"
        })
        .then(response => {
            if (response.ok) {
                cardElement.remove(); // Remover la card del DOM
                alert("Gatito eliminado con éxito");
            } else {
                throw new Error("No se pudo eliminar el gatito");
            }
        })
        .catch(error => console.error("Error al eliminar el gatito:", error));
    }
});

// transicion index.html - carga.html


