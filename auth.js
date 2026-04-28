async function loginUser() {

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch("http://localhost:5000/login", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token && data.user) {

    // Store token
    localStorage.setItem("token", data.token);

    // Store full user object
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirect
    window.location.href = "ai.html";

  } else {
    document.getElementById("loginMessage").innerText =
      data.error || "Login failed";
  }
}