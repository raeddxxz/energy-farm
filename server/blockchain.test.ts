import { describe, it, expect } from "vitest";
import { validateBlockchainSecrets } from "./blockchain";

describe("Blockchain Integration", () => {
  it("should validate blockchain endpoints and seed phrase", async () => {
    const result = await validateBlockchainSecrets();
    expect(result.tonValid).toBe(true);
    expect(result.bep20Valid).toBe(true);
    expect(result.seedPhraseValid).toBe(true);
  });
});
