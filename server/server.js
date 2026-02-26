import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

/*
  CREATE CHECKOUT SESSION
*/
app.post("/create-checkout-session", async (req, res) => {
  const { plan } = req.body;

  const priceMap = {
    plus: "price_1T57EzFk99K657Gi6Pv4sX03",
    pro: "price_1T57GvFk99K657GiHSAQiUEC",
    platinum: "price_1T57HMFk99K657Gi0jNsiEkm",
  };

  const selectedPrice = priceMap[plan];

  if (!selectedPrice) {
    return res.status(400).json({ error: "Invalid plan selected" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPrice,
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Stripe session failed" });
  }
});

/*
  WEBHOOK
*/
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`Webhook Error: ${err.message}`);
      return res.sendStatus(400);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Subscription started:", session.id);
    }

    if (event.type === "customer.subscription.deleted") {
      console.log("Subscription canceled");
    }

    res.json({ received: true });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});