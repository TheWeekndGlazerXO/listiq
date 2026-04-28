import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/* =======================================================
   ENV SETUP
======================================================= */
dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY missing from .env");
}

const REQUIRED_ENV = [
  "STRIPE_PLUS_PRICE_ID",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_PLATINUM_PRICE_ID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_WEBHOOK_SECRET"
];

REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`❌ Missing env var: ${key}`);
  }
});


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =======================================================
   PRICE IDS (LOCKED + LOGGED)
======================================================= */
const PRICE_IDS = {
  plus: process.env.STRIPE_PLUS_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
  platinum: process.env.STRIPE_PLATINUM_PRICE_ID
};

console.log("✅ PRICE IDS LOADED:", PRICE_IDS);

/* =======================================================
   WEBHOOK (RAW BODY — MUST BE FIRST)
======================================================= */
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature failed:", err.message);
      return res.status(400).send("Webhook Error");
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const userId = Number(session.metadata.userId);
        const plan = session.metadata.plan;
        const influencerUserId =
          session.metadata.influencerUserId || null;
        const amountTotal = session.amount_total;

        await supabase
          .from("users")
          .update({ subscription_tier: plan })
          .eq("id", userId);

        await supabase.from("subscriptions").insert({
          user_id: userId,
          plan,
          price: amountTotal / 100,
          stripe_subscription_id: session.subscription
        });

        await supabase.from("payments").insert({
          user_id: userId,
          stripe_invoice_id: session.invoice,
          original_amount: amountTotal / 100,
          final_amount: amountTotal / 100
        });

        if (influencerUserId) {
          await supabase.from("commissions").insert({
            influencer_user_id: Number(influencerUserId),
            referred_user_id: userId,
            amount_cents: Math.round(amountTotal * 0.25)
          });
        }

        console.log("✅ Subscription activated for user", userId);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("❌ Webhook processing error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

/* =======================================================
   NORMAL MIDDLEWARE
======================================================= */
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* =======================================================
   CREATE CHECKOUT SESSION
======================================================= */
app.post("/create-checkout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const token = authHeader.split(" ")[1];

    const { data: supaUser, error } =
      await supabase.auth.getUser(token);

    if (error || !supaUser?.user) {
      return res.status(401).json({ error: "Invalid Supabase token" });
    }

    const { plan, referralCode } = req.body;

    if (!plan || !PRICE_IDS[plan]) {
      console.error("❌ Invalid plan received:", plan);
      return res.status(400).json({ error: "Invalid subscription plan" });
    }

    const email = supaUser.user.email;

    const { data: dbUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (!dbUser) {
      return res.status(400).json({ error: "User not found in DB" });
    }

    /* ---------- Stripe customer ---------- */
    let stripeCustomerId = dbUser.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email
      });

      stripeCustomerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", dbUser.id);
    }

    /* ---------- Referral ---------- */
    let influencerUserId = null;
    let couponId = null;

    if (referralCode) {
      const { data: code } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("code", referralCode)
        .eq("active", true)
        .single();

      if (code) {
        influencerUserId = code.user_id;

        const coupon = await stripe.coupons.create({
          percent_off: code.discount_percent,
          duration: "once"
        });

        couponId = coupon.id;
      }
    }

    /* ---------- Checkout ---------- */
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1
        }
      ],
      discounts: couponId ? [{ coupon: couponId }] : [],
      success_url: "http://localhost:3000/success.html",
      cancel_url: "http://localhost:3000/subscribe.html",
      metadata: {
        userId: dbUser.id.toString(),
        plan,
        influencerUserId: influencerUserId
          ? influencerUserId.toString()
          : ""
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Checkout error:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});
import express from "express"
import fetch from "node-fetch"
import cors from "cors"

const app = express()
app.use(express.json())
app.use(cors())

/* TEST ROUTE */
app.get("/api/test", (req,res)=>{
 res.json({status:"server working"})
})

/* STOCK DATA */
app.get("/api/stock", async (req,res)=>{

 const ticker = req.query.ticker

 if(!ticker){
  return res.status(400).json({error:"ticker required"})
 }

 try{

 const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`)
 const data = await r.json()

 const quote = data.quoteResponse.result[0]

 res.json({
  ticker,
  price: quote.regularMarketPrice,
  change: quote.regularMarketChangePercent
 })

 }catch(err){
  res.status(500).json({error:"stock fetch failed"})
 }

})

/* NEWS DATA */
app.get("/api/news", async (req,res)=>{

 const ticker = req.query.ticker

 try{

 const r = await fetch(`https://newsapi.org/v2/everything?q=${ticker}&apiKey=${process.env.NEWS_API_KEY}`)
 const data = await r.json()

 res.json(data.articles.slice(0,5))

 }catch(err){
  res.status(500).json({error:"news fetch failed"})
 }

})


app.post("/generate-store-site", async(req,res)=>{

  const {name,products} = req.body
  
  const ai = await openai.chat.completions.create({
  
  model:"gpt-4o-mini",
  
  messages:[
  
  {
  role:"system",
  content:"You are a professional ecommerce brand builder"
  },
  
  {
  role:"user",
  content:`
  Create a brand concept for a store called ${name}.
  
  Products:
  ${products.map(p=>p.title).join(", ")}
  
  Return:
  
  store description
  homepage headline
  marketing angle
  `
  }
  
  ]
  
  })
  
  res.json({
  
  url:`https://listiq.store/${name.toLowerCase()}`,
  
  concept:ai.choices[0].message.content
  
  })
  
  })
/* =======================================================
   START SERVER
======================================================= */
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});