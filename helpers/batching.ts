export const generateBatches = function* <T>(
  numberOfBatches: number,
  batchSize: number,
  generateItemFn,
  ...args: any[]
) {
  let batch: T[] = [];
  for (let i = 0; i < numberOfBatches; i++) {
    for (let j = 0; j < batchSize; j++) {
      batch.push(generateItemFn(...args));
    }
    yield batch;
    batch = [];
  }
};
