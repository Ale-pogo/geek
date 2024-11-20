document.addEventListener("DOMContentLoaded", () => {
    // Seleccionar el formulario y los botones
    const gatitoForm = document.getElementById("gatito-form");
    const clearFormButton = document.getElementById("clear-form-button");

    // Evento para limpiar el formulario al hacer clic en "Limpiar Formulario"
    clearFormButton.addEventListener("click", () => {
        gatitoForm.reset(); // Limpia todos los campos del formulario
    });

    gatitoForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Prevenir el envío por defecto

        // Obtener valores de los campos del formulario
        const nombre = document.getElementById("nombre").value;
        const foto = document.getElementById("foto").value;
        const datos = document.getElementById("datos").value;
        const tiempo = document.getElementById("tiempo").value;
        const contacto = document.getElementById("contacto").value;

        // Validar y agregar el gatito
        if (nombre && foto && datos && tiempo && contacto) {
            fetch("http://localhost:3002/gatitos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nombre,
                    foto,
                    datos,
                    tiempo,
                    contacto
                })
            })
            .then(response => response.json())
            .then(data => {
                alert("Gatito agregado con éxito!");
                gatitoForm.reset(); // Limpia el formulario después de agregar el gatito
            })
            .catch(error => console.error("Error al agregar el gatito:", error));
        } else {
            alert("Por favor, completa todos los campos");
        }
    });
});
