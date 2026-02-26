import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function optimizeListing(input) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert Shopify SEO and CRO specialist."
      },
      {
        role: "user",
        content: `Optimize this product listing:
${input}

Return:
1. Optimized Title
2. Bullet Points
3. Long Description
4. Tags
5. Pricing Suggestions`
      }
    ]
  });

  return completion.choices[0].message.content;
}