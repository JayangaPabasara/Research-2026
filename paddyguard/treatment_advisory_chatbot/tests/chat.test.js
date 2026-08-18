const request = require("supertest");
const app = require("../server");

describe("GET /health", () => {
  it("returns service status", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe("treatment_advisory_chatbot");
  });
});

describe("POST /chat", () => {
  it("returns 400 when message is missing", async () => {
    const res = await request(app).post("/chat").send({ session_id: "test" });
    expect(res.statusCode).toBe(400);
  });

  it("returns a recommendation for a known disease", async () => {
    const res = await request(app)
      .post("/chat")
      .send({ message: "brown spot oval lesion yellow ring", session_id: "test" });
    expect(res.statusCode).toBe(200);
    expect(res.body.recommendation).toBeDefined();
  });
});
