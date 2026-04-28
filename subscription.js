async function subscribeTier(plan) {

    // Get Supabase auth storage key dynamically
    const supabaseKey = Object.keys(localStorage).find(key =>
      key.includes("auth-token")
    );
  
    if (!supabaseKey) {
      alert("Please login first.");
      window.location.href = "login.html";
      return;
    }
  
    const session = JSON.parse(localStorage.getItem(supabaseKey));
  
    if (!session?.access_token) {
      alert("Please login first.");
      window.location.href = "login.html";
      return;
    }
  
    const referralCode = localStorage.getItem("referralCode");
  
    const res = await fetch("/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        plan,
        referralCode
      })
    });
  
    const data = await res.json();
  
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "Checkout failed.");
    }
  }