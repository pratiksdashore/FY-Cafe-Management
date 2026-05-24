// recommendation.js

class AIRecommendationEngine {
  constructor(items, options = {}) {
    this.items = items; // list of recommendable items
    this.epsilon = options.epsilon || 0.2; // exploration rate
    this.values = {};  // estimated value of each item
    this.counts = {};  // number of times each item recommended

    items.forEach(item => {
      this.values[item.id] = 0;
      this.counts[item.id] = 0;
    });
  }

  // Choose item using epsilon-greedy
  recommend() {
    if (Math.random() < this.epsilon) {
      return this.items[Math.floor(Math.random() * this.items.length)];
    }

    let bestItem = this.items[0];
    let bestValue = this.values[bestItem.id];

    this.items.forEach(item => {
      if (this.values[item.id] > bestValue) {
        bestValue = this.values[item.id];
        bestItem = item;
      }
    });

    return bestItem;
  }

  // Update reward after user feedback
  update(itemId, reward) {
    this.counts[itemId] += 1;

    const n = this.counts[itemId];
    const value = this.values[itemId];

    // Incremental average update
    this.values[itemId] =
      value + (reward - value) / n;
  }

  getStats() {
    return {
      values: this.values,
      counts: this.counts
    };
  }
}

module.exports = AIRecommendationEngine;