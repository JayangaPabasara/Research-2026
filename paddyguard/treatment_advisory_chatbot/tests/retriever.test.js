const { retrieve } = require("../rag/retriever");

test("retrieves leaf blast entry for matching keywords", () => {
  const entry = retrieve("I see diamond shaped gray lesions on the leaf blast symptoms");
  expect(entry).not.toBeNull();
  expect(entry.id).toBe("leaf_blast");
});

test("returns null for unrelated queries", () => {
  const entry = retrieve("what time does the market open");
  expect(entry).toBeNull();
});
