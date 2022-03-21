import { activityHeal } from "../../src/game/activities/activityHeal";

describe("Healing based on different Stats", () => {
  it("Should Heal 180 health up to 480", () => {
    const health = 300;
    const maxHealth = 600;
    const aether = 236;
    const xpGain = 60;
    const updatedHealth = activityHeal(health, maxHealth, aether, xpGain);

    expect(updatedHealth).toBe(480);
  });

  it("Should Heal heal all the way to 600", () => {
    const health = 500;
    const maxHealth = 600;
    const aether = 236;
    const xpGain = 60;
    const updatedHealth = activityHeal(health, maxHealth, aether, xpGain);

    expect(updatedHealth).toBe(600);
  });

  it("Should not heal anything because no aether", () => {
    const health = 500;
    const maxHealth = 600;
    const aether = 0;
    const xpGain = 60;
    const updatedHealth = activityHeal(health, maxHealth, aether, xpGain);

    expect(updatedHealth).toBe(updatedHealth);
  });
});
