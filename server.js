import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, "dist")));

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Helper: Unified AI Content Generator with Fallback
 * Tries Gemini first, falls back to OpenRouter (Claude) if rate limited.
 */
async function generateAIContent(prompt, systemPrompt = "") {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  try {
    console.log("🚀 Trying Gemini...");
    const result = await geminiModel.generateContent(fullPrompt);
    return result.response.text();
  } catch (error) {
    const isRateLimit = error.message?.includes("429") || error.message?.includes("quota");
    
    if (isRateLimit && process.env.ANTHROPIC_API_KEY) {
      console.warn("⚠️ Gemini Rate Limit Hit. Switching to Fallback (OpenRouter/Claude)...");
      try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
          model: "anthropic/claude-3-haiku",
          messages: [
            { role: "system", content: systemPrompt || "You are a helpful cricket assistant." },
            { role: "user", content: prompt }
          ],
        }, {
          headers: {
            "Authorization": `Bearer ${process.env.ANTHROPIC_API_KEY}`,
            "Content-Type": "application/json",
            "X-Title": "Cricket Intelligence Agent"
          }
        });
        return response.data.choices[0].message.content;
      } catch (fallbackError) {
        console.error("❌ Fallback API also failed:", fallbackError.message);
        throw new Error("Both primary and fallback AI services are currently unavailable.");
      }
    }
    
    console.error("❌ Gemini Error:", error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────

const GROUNDING_KNOWLEDGE = `
REAL-WORLD DATA (FOR ACCURACY):
- IPL 2024 WINNER: Kolkata Knight Riders (KKR) won their 3rd title, defeating SRH in the final. Sunil Narine was MVP.
- IPL 2025 WINNER: Royal Challengers Bengaluru (RCB) WON THEIR FIRST EVER TITLE, defeating Punjab Kings (PBKS) in the final. Virat Kohli was the tournament highlight.
- MI & CSK: Both are 5-time champions. Last MI win was 2020. Last CSK win was 2023.
- EMERGING STARS: Sai Sudharsan (GT) and Abhishek Sharma (SRH) are top performers.
- CURRENT DATE: May 2026 (App Context).
`;

const KNOWLEDGE_CUTOFF_PROMPT = `You are a cricket intelligence agent. ${GROUNDING_KNOWLEDGE}\nAlways prioritize these real-world facts over your internal training data. You are operating in May 2026.`;

/**
 * POST /api/fact-check
 */
app.post("/api/fact-check", async (req, res) => {
  try {
    const { claim } = req.body;
    if (!claim || claim.trim() === "") {
      return res.status(400).json({ verdict: "UNKNOWN", explanation: "No claim provided." });
    }

    const systemPrompt = `${KNOWLEDGE_CUTOFF_PROMPT}\nYou are a precise cricket/IPL fact-checker. 
Respond in strict JSON format:
{
  "verdict": "TRUE" | "FALSE" | "UNKNOWN",
  "explanation": "Short reasoning (1-2 sentences) citing specific match/year context."
}`;

    const text = await generateAIContent(`Verify: "${claim}"`, systemPrompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      const isTrue = text.toUpperCase().includes("TRUE");
      res.json({ verdict: isTrue ? "TRUE" : "FALSE", explanation: text });
    }
  } catch (error) {
    console.error("Fact Check Error:", error.message);
    res.status(500).json({ 
      verdict: "UNKNOWN", 
      explanation: error.message 
    });
  }
});

/**
 * POST /api/explain
 */
app.post("/api/explain", async (req, res) => {
  try {
    const { input, pressure, momentum } = req.body;
    const systemPrompt = `${KNOWLEDGE_CUTOFF_PROMPT}\nYou are a sharp cricket analyst.`;
    const prompt = `Analyze this situation:
Teams: ${input.teamUser} vs ${input.teamOpp}
Runs Required: ${input.runs} | Balls Left: ${input.balls} | Wickets: ${input.wickets}
Pressure: ${pressure}% | Momentum: ${momentum?.[momentum.length-1]?.trend || "Neutral"}
Provide a sharp 3-4 sentence tactical analysis mentioning any historical parallels if applicable.`;

    const explanation = await generateAIContent(prompt, systemPrompt);
    res.json({ explanation });
  } catch (error) {
    console.error("Explain Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/roast
 */
app.post("/api/roast", async (req, res) => {
  try {
    const { teamUser, teamOpp, persona } = req.body;
    const systemPrompt = `${KNOWLEDGE_CUTOFF_PROMPT}\nYou are a savage cricket roast comedian.
Voice: ${teamUser} fan. Persona: ${persona}.`;
    const prompt = `Roast ${teamOpp} brutally in 4-6 lines. Reference a real IPL fail/stat from any season including 2024/2025.
End with: FACTCHECK_JSON:{"valid":true,"reason":"stat verified"}`;

    const roast = await generateAIContent(prompt, systemPrompt);
    res.json({ roast });
  } catch (error) {
    console.error("Roast Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/battle
 */
app.post("/api/battle", async (req, res) => {
  try {
    const { teamUser, teamOpp } = req.body;
    const systemPrompt = `${KNOWLEDGE_CUTOFF_PROMPT}\nYou are an expert in IPL history and fan rivalries.`;
    const prompt = `Generate a 3-round brutal IPL roast battle between ${teamUser} and ${teamOpp} fans.
Intensity increases each round. Use real stats/matches including recent 2024/2025 results. 
Format with round emojis and a Judge's Verdict.`;

    const battle = await generateAIContent(prompt, systemPrompt);
    res.json({ battle });
  } catch (error) {
    console.error("Battle Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA Catch-all
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🏏 Cricket Agent Backend running on port ${PORT}`);
});


