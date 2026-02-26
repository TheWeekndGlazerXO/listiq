const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== "zioncmulangala@gmail.com") {
    window.location.href = "index.html";
  }
}

async function loadDashboard() {
  const { data } = await supabase
    .from("users")
    .select("subscription_tier, subscription_started_at");

  const free = data.filter(u => u.subscription_tier === "free").length;
  const plus = data.filter(u => u.subscription_tier === "plus").length;
  const pro = data.filter(u => u.subscription_tier === "pro").length;
  const platinum = data.filter(u => u.subscription_tier === "platinum").length;

  document.getElementById("freeCount").innerText = free;
  document.getElementById("plusCount").innerText = plus;
  document.getElementById("proCount").innerText = pro;
  document.getElementById("platinumCount").innerText = platinum;

  const revenue = (plus*19)+(pro*49)+(platinum*129);

  createCharts(free,plus,pro,platinum,revenue,data);
}

function createCharts(free,plus,pro,platinum,revenue,data){

new Chart(document.getElementById('subscriberChart'),{
type:'bar',
data:{
labels:['Free','Plus','Pro','Platinum'],
datasets:[{data:[free,plus,pro,platinum]}]
}
});

new Chart(document.getElementById('revenueChart'),{
type:'line',
data:{
labels:['Current'],
datasets:[{data:[revenue]}]
}
});

new Chart(document.getElementById('growthChart'),{
type:'line',
data:{
labels:['Month 1','Month 2','Month 3'],
datasets:[{data:[10,25,data.length]}]
}
});

new Chart(document.getElementById('distributionChart'),{
type:'doughnut',
data:{
labels:['Free','Plus','Pro','Platinum'],
datasets:[{data:[free,plus,pro,platinum]}]
}
});

}

checkAdmin();
loadDashboard();