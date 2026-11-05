// Deterministic test env: no real AI keys, so AI calls exercise the fallback path unless mocked.
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-123456";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:1/placeholder"; // overridden by test-db helper
process.env.PUBLISHER_NAME ??= "Inkwell Publishing";
delete process.env.GEMINI_API_KEY;
delete process.env.GROQ_API_KEY;
