const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors({
  origin: '*', // Allows any frontend to connect (required for Render/Vercel deployment)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Dummy route to stop Chrome DevTools .well-known 404 spam
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({ status: "ok" });
});

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const GROUNDING_KNOWLEDGE = `
CURRENT YEAR: 2026.
RECENT IPL HISTORY:
- IPL 2024: Kolkata Knight Riders (KKR) won their 3rd title, defeating SRH in the final. Sunil Narine was MVP.
- IPL 2025: Royal Challengers Bengaluru (RCB) WON THEIR FIRST EVER TITLE, defeating PBKS by 6 runs in a thriller. Krunal Pandya was Final POTM. Virat Kohli remains the GOAT but now has a trophy.
- MI remains a 5-time champion (last won 2020).
- CSK remains a 5-time champion (last won 2023).
- Sai Sudharsan (GT) is the rising superstar (2025 Orange Cap).
`;

/**
 * Requirement 6: Backend factCheckClaim function
 * requirement 2: Improved AI prompt
 * requirement 7: UNKNOWN validation
 */
async function factCheckClaim(claim) {
  if (!claim || claim.trim().length < 3) {
    return { verdict: "UNKNOWN", explanation: "Claim is too short or empty." };
  }

  // Requirement 2: Clearly instruct the model to verify the given claim only
  const systemPrompt = `You are a precise cricket/IPL fact-checker with encyclopedic knowledge up to 2026.
${GROUNDING_KNOWLEDGE}
Your task is to verify the given claim and ONLY the given claim.
Do not generate unrelated team info, generic stats, or mention other teams unless directly relevant to the claim.
Use your deep knowledge of IPL history, player stats, and match results.

Response Format (Strict JSON):
{
  "verdict": "TRUE" | "FALSE" | "UNKNOWN",
  "explanation": "Short, accurate reasoning (1-2 sentences). Cite specific match, year, or players."
}

Rules:
1. If the claim is factually correct, verdict is TRUE.
2. If the claim is factually incorrect, verdict is FALSE.
3. If the claim is vague, unclear, or not related to cricket/IPL, return UNKNOWN.
4. No conversational filler. Just the JSON.`;

  const userPrompt = `Verify this claim: "${claim}"`;

  try {
    // Using OpenRouter with an Anthropic model
    const response = await axios.post(OPENROUTER_URL, {
      model: "anthropic/claude-3-haiku",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANTHROPIC_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173", // Optional, for OpenRouter analytics
        "X-Title": "Cricket Intelligence Agent"
      }
    });

    const text = response.data.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      // Double check verdict values
      if (!["TRUE", "FALSE", "UNKNOWN"].includes(result.verdict)) {
        result.verdict = "UNKNOWN";
      }
      return result;
    }
    
    return { verdict: "UNKNOWN", explanation: "The AI response was not in the expected format." };
  } catch (error) {
    console.error("Fact Check API Error:", error.response?.data || error.message);
    return { 
      verdict: "UNKNOWN", 
      explanation: "Could not verify claim due to an API error. Check if ANTHROPIC_API_KEY is set." 
    };
  }
}

app.post('/api/fact-check', async (req, res) => {
  const { claim } = req.body;
  console.log(`Checking claim: ${claim}`);
  const result = await factCheckClaim(claim);
  res.json(result);
});

/**
 * NEW: Analysis / Explanation Route
 */
app.post('/api/explain', async (req, res) => {
  const { input, pressure, momentum, memCtx } = req.body;
  
  const systemPrompt = `You are a sharp, direct cricket match analyst. Current year: 2026.
${GROUNDING_KNOWLEDGE}
Provide insight in exactly 3-4 sentences.
Use tactical language. No fluff. Explain pressure dynamics and momentum shift causes.
${memCtx ? "Previous session context: " + memCtx : ""}`;

  const userPrompt = `
Analyze this IPL situation:
Teams: ${input.teamUser} vs ${input.teamOpp}
Runs Required: ${input.runs || "N/A"} | Balls Left: ${input.balls || "N/A"} | Wickets in Hand: ${input.wickets || "N/A"}
Computed Pressure Score: ${pressure ?? "N/A"}/100
Explain WHY pressure is at this level, what caused any momentum shift, and what needs to happen next.`;

  try {
    const response = await axios.post(OPENROUTER_URL, {
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }, {
      headers: { "Authorization": `Bearer ${ANTHROPIC_API_KEY}`, "Content-Type": "application/json" }
    });
    res.json({ explanation: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

/**
 * NEW: Roast Route
 */
app.post('/api/roast', async (req, res) => {
  const { teamUser, teamOpp, memCtx, persona } = req.body;
  
  const systemPrompt = `You are a savage cricket roast comedian. Current year: 2026.
${GROUNDING_KNOWLEDGE}
You MUST reason through these steps:
STEP 1 — PROFILE: List ${teamOpp}'s real IPL weaknesses (including 2024/2025 fails).
STEP 2 — VOICE: You ARE a ${teamUser} fan. Persona: "${persona}".
STEP 3 — ANGLE: Pick ONE sharp, specific, current weakness to attack.
STEP 4 — ROAST: Write exactly 4–6 punchy lines. MUST reference a real IPL match/season/stat.
Then output on a final line: FACTCHECK_JSON:{"valid":true,"reason":"reasoning"}`;

  const userPrompt = `Roast ${teamOpp} from a ${teamUser} fan's perspective.`;

  try {
    const response = await axios.post(OPENROUTER_URL, {
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }, {
      headers: { "Authorization": `Bearer ${ANTHROPIC_API_KEY}`, "Content-Type": "application/json" }
    });
    res.json({ roast: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Roast failed" });
  }
});

/**
 * NEW: Roast Battle Route
 */
app.post('/api/battle', async (req, res) => {
  const { teamUser, teamOpp, memCtx } = req.body;
  
  const systemPrompt = `Run a FULL 3-round IPL roast battle between fans of ${teamUser} and ${teamOpp}.
Current year: 2026. ${GROUNDING_KNOWLEDGE}
Intensity MUST increase each round. Use real IPL matches, years, scores (including 2024-2025). 
Reference actual player names.
Both teams get equal roast quality — make it fair but brutal.
Format with emojis for Round 1, 2, 3 and a Judge's Verdict.`;

  const userPrompt = `Generate the full roast battle.`;

  try {
    const response = await axios.post(OPENROUTER_URL, {
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }, {
      headers: { "Authorization": `Bearer ${ANTHROPIC_API_KEY}`, "Content-Type": "application/json" }
    });
    res.json({ battle: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Battle failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Cricket Intelligence Backend running on port ${PORT}`);
});
