const existingPick = { confidence: null };
const newPick = {};
if (existingPick?.confidence !== undefined) {
  newPick.confidence = existingPick.confidence;
}
console.log(newPick);
