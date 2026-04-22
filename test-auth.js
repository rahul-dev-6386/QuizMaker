import https from "https";
import http from "http";

const URL = "https://quizmaster-backend-qu62.onrender.com/signin";
const ADMIN_URL = "https://quizmaster-backend-qu62.onrender.com/admin/request-otp";

async function run() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  try {
    // 1. Sign in
    console.log("Signing in...");
    const req1 = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password" })
    });
    
    const setCookie = req1.headers.get("set-cookie");
    const data1 = await req1.json();
    console.log("SignIn Data:", data1);
    console.log("Cookie:", setCookie);

    if (!setCookie) {
      console.log("No cookie found. Cannot proceed.");
      return;
    }

    // 2. Request OTP
    console.log("\nRequesting OTP...");
    const req2 = await fetch(ADMIN_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": setCookie,
      },
      body: JSON.stringify({ key: "72487" })
    });
    
    const data2 = await req2.json();
    console.log("\nResponse Status:", req2.status);
    console.log("Response Body:", data2);

  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
run();
