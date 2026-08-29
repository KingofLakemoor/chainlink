const existingPick = { tiebreakerTotal: 45 };
const newPick = {};
if (existingPick?.confidence !== undefined) {
  newPick.confidence = existingPick.confidence;
}
console.log(newPick);
