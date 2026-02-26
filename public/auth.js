// auth.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://nugtwmuiztbbhvuakrnu.supabase.co',
  'sb_publishable_UO7wZCYbFqW1SrU02ai7BA_IFP2Mvbu'
)



// SIGN UP
window.signupUser = async function () {
  const email = document.getElementById('signupEmail').value
  const password = document.getElementById('signupPassword').value
  const messageDiv = document.getElementById('signupMessage')

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "http://localhost:5500/index.html"
    }
  })

  if (error) {
    messageDiv.innerText = error.message
  } else {
    messageDiv.innerText = "Check your email to confirm."
  }
}

// LOGIN
window.loginUser = async function () {
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  const messageDiv = document.getElementById('loginMessage')

  if (!email || !password) {
    messageDiv.innerText = "Please enter email and password."
    return
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    messageDiv.innerText = error.message
  } else {
    window.location.href = "index.html"
  }
}