import assert from "node:assert/strict";
import { computeGoalsFromProfile } from "./goals";
import { isOffTopicUserMessage } from "./scope";

const goals = computeGoalsFromProfile({
  activity: "moderate",
  age: 30,
  heightCm: 175,
  sex: "male",
  weightKg: 72,
});

assert.ok(goals.calories > 1500);
assert.ok(goals.proteinG > 50);
assert.equal(goals.isDefault, false);

assert.equal(isOffTopicUserMessage("write me java code to add numbers"), true);
assert.equal(isOffTopicUserMessage("I had 2 chapati and dal for lunch"), false);

console.log("nutrition unit checks passed");
