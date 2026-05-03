import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ─────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/fact-check
 * Receives a cricket claim and returns fact-checked result
 */
app.post("/api/fact-check", async (req, res) => {
  try {
    const { claim } = req.body;

    console.log("📨 Received claim:", claim);
    console.log("🔑 API Key loaded:", process.env.GEMINI_API_KEY ? "✅ YES" : "❌ NO");

    if (!claim || claim.trim() === "") {
      return res.status(400).json({
        valid: false,
        reason: "No claim provided. Please enter a cricket claim to verify.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        valid: false,
        reason: "GEMINI_API_KEY not set in .env file",
      });
    }

    // Call Gemini API with the exact claim
    const systemPrompt = `You are a precise cricket/IPL fact-checker with encyclopedic knowledge.
Always start your response with either TRUE or FALSE (exactly as written, first word).
Then in 2-3 sentences: state what the real fact is, cite specific correct stat/match/year if applicable.
Be dynamic based on the claim provided.`;

    console.log("🚀 Calling Gemini API...");
    
    const result = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nVerify this cricket claim: "${claim}"`,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();

    console.log("✅ Gemini response:", responseText);

    // Parse response
    const isTrue = responseText.trim().toUpperCase().startsWith("TRUE");
    const reason = responseText;

    res.json({
      valid: isTrue,
      reason: reason,
      claim: claim, // Echo back the claim to verify it was processed
    });
  } catch (error) {
    console.error("❌ Error in fact-check:", error);
    console.error("❌ Error message:", error.message);
    res.status(500).json({
      valid: false,
      reason: `Error while fact-checking: ${error.message}. Make sure your GEMINI_API_KEY is valid in .env`,
    });
  }
});

/**
 * POST /api/explain
 * Pressure & Momentum analysis
 */
app.post("/api/explain", async (req, res) => {
  try {
    const { input, pressure, momentum } = req.body;

    console.log("📨 Received explanation request:", input);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        explanation: "GEMINI_API_KEY not set in .env file",
      });
    }

    const systemPrompt = `You are a cricket strategist. Analyze pressure and momentum in IPL matches.`;

    const result = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nPressure: ${pressure}%, Momentum: ${momentum}%. Situation: ${input}`,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();

    res.json({
      explanation: responseText,
    });
  } catch (error) {
    console.error("❌ Error in explain:", error);
    res.status(500).json({
      explanation: `Error: ${error.message}`,
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        status: "error",
        message: "GEMINI_API_KEY is missing",
        apiKey: "❌ Missing",
      });
    }

    // Test the API key with a simple message
    const testResult = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: "Say OK",
            },
          ],
        },
      ],
    });

    const testText = testResult.response.text();

    res.json({
      status: "ok",
      message: "Cricket Agent API is running and Gemini key is valid",
      apiKey: "✅ Working",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    res.status(500).json({
      status: "error",
      message: `Health check failed: ${error.message}`,
      apiKey: "❌ Invalid or expired",
      hint: "Check your GEMINI_API_KEY in .env file",
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// ─────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🏏 Cricket Intelligence Agent - Backend Server           ║
║  ✅ Running on http://localhost:${PORT}                  ║
║  🔄 Using: Google Gemini API                              ║
║  📚 API Routes:                                            ║
║     POST /api/fact-check  - Verify cricket claims         ║
║     POST /api/explain     - Get analysis                  ║
║     GET  /api/health      - Health check                  ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Verify API key
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "⚠️  WARNING: GEMINI_API_KEY is not set in environment variables!"
    );
    console.warn("   Create a .env file with: GEMINI_API_KEY=your-key");
  } else {
    const keyPreview = process.env.GEMINI_API_KEY.substring(0, 20) + "...";
    console.log(`✅ GEMINI_API_KEY is configured: ${keyPreview}`);
    console.log("📝 Test the API by visiting: http://localhost:5000/api/health");
  }
});

