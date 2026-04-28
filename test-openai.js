import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY
});

async function test(){

 const r = await openai.chat.completions.create({
  model:"gpt-4o-mini",
  messages:[{role:"user",content:"Say hello"}]
 });

 console.log(r.choices[0].message.content);

}

test();