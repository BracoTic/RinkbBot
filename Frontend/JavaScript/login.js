// Frontend/JavaScript/login.js
const API_BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorMsg = document.getElementById("error-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();

    errorMsg.style.display = "none";
    errorMsg.textContent = "";

    if (!user || !pass) {
      errorMsg.textContent = "Por favor ingresa usuario y contraseña.";
      errorMsg.style.display = "block";
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: user, password: pass }),
      });

      if (!res.ok) {
        const dataErr = await res.json().catch(() => ({}));
        console.error("Error login:", dataErr);
        errorMsg.textContent = dataErr.error || "Usuario o contraseña incorrectos";
        errorMsg.style.display = "block";
        return;
      }

      const data = await res.json();

      if (!data.ok || !data.user) {
        errorMsg.textContent = "No se pudo iniciar sesión. Intenta de nuevo.";
        errorMsg.style.display = "block";
        return;
      }

      // 🔐 Guardamos el usuario real en localStorage
      localStorage.setItem("rinkbot_user", JSON.stringify(data.user));

      // 👉 Redirige al home
      window.location.href = "homelogin.html";
    } catch (err) {
      console.error("Error general de login:", err);
      errorMsg.textContent = "Error al conectar con el servidor. Intenta más tarde.";
      errorMsg.style.display = "block";
    }
  });
});
