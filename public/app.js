const supabaseUrl = "https://nugtwmuiztbbhvuakrnu.supabase.co";
const supabaseKey = "sb_publishable_UO7wZCYbFqW1SrU02ai7BA_IFP2Mvbu";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadProfile(user.id);
}

async function loadProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (data) {
    document.getElementById("userPlan").innerText =
      data.plan === "pro" ? "Pro Plan" : "Free Plan";

    document.getElementById("usageInfo").innerText =
      `${data.analyses_used} / ${data.analyses_limit} analyses used`;
  }
}

async function analyze() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile.analyses_used >= profile.analyses_limit) {
    alert("Usage limit reached. Upgrade to continue.");
    return;
  }

  // Fake AI result for now
  const resultText = "AI audit complete. CTA contrast should increase.";

  await supabase.from("analyses").insert([
    {
      user_id: user.id,
      type: document.getElementById("analysisType").value,
      result: resultText,
      score: 82
    }
  ]);

  await supabase
    .from("profiles")
    .update({ analyses_used: profile.analyses_used + 1 })
    .eq("id", user.id);

  document.getElementById("analysisOutput").innerText = resultText;

  loadProfile(user.id);
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

checkUser();