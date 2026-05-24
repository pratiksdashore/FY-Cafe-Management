// scheduler.js

class HybridScheduler {
  constructor(processes, options = {}) {
    // processes: Array of { id, burstTime, ... }
    // burstTime is the base preparation time required for the order
    this.processes = processes.map(p => ({
      ...p,
      remainingTime: p.burstTime,
      totalWait: 0,
      startTime: null,
      completionTime: null
    }));

    this.numChefs = options.numChefs || 1;
    this.chefIds = options.chefIds || Array.from({ length: this.numChefs }, (_, i) => `chef_${i}`);
    this.timeQuantum = options.initialQuantum || 5;

    // Historical factor to adjust the base prep time (burstTime)
    this.historicalWaitFactor = options.historicalWaitFactor || 1.0;

    // Apply historical factor to burst times
    this.processes.forEach(p => {
      p.remainingTime *= this.historicalWaitFactor;
      p.burstTime *= this.historicalWaitFactor;
    });

    this.alpha = 0.1;
    this.gamma = 0.9;
    this.epsilon = 0.2;
    this.qTable = options.qTable || {};
    this.currentTime = 0;
  }

  getState() {
    const avgWaiting =
      this.processes.reduce((acc, p) => acc + (p.totalWait || 0), 0) /
      (this.processes.length || 1);

    if (avgWaiting < 5) return "LOW_WAIT";
    if (avgWaiting < 15) return "MEDIUM_WAIT";
    return "HIGH_WAIT";
  }

  getActions() {
    return ["DECREASE_Q", "KEEP_Q", "INCREASE_Q"];
  }

  chooseAction(state) {
    if (!this.qTable[state]) {
      this.qTable[state] = {};
      this.getActions().forEach(a => (this.qTable[state][a] = 0));
    }

    if (Math.random() < this.epsilon) {
      const actions = this.getActions();
      return actions[Math.floor(Math.random() * actions.length)];
    }

    return Object.keys(this.qTable[state]).reduce((a, b) =>
      this.qTable[state][a] > this.qTable[state][b] ? a : b
    );
  }

  updateQValue(state, action, reward, nextState) {
    if (!this.qTable[nextState]) {
      this.qTable[nextState] = {};
      this.getActions().forEach(a => (this.qTable[nextState][a] = 0));
    }

    const maxNextQ = Math.max(...Object.values(this.qTable[nextState]));

    this.qTable[state][action] =
      this.qTable[state][action] +
      this.alpha * (reward + this.gamma * maxNextQ - this.qTable[state][action]);
  }

  adjustQuantum(action) {
    if (action === "DECREASE_Q" && this.timeQuantum > 2) this.timeQuantum--;
    if (action === "INCREASE_Q" && this.timeQuantum < 20) this.timeQuantum++;
  }

  run() {
    const queue = [...this.processes];
    const completed = [];
    const activeTasks = []; // { process, quantumRemaining, chefId }

    while (queue.length > 0 || activeTasks.length > 0) {
      // RL Step
      const state = this.getState();
      const action = this.chooseAction(state);
      this.adjustQuantum(action);

      // Fill empty chef slots with Sticky Logic
      const busyChefIds = activeTasks.map(t => t.chefId);
      const availableChefIds = this.chefIds.filter(id => !busyChefIds.includes(id));

      for (const chefId of availableChefIds) {
        if (queue.length === 0) break;

        // Priority Logic:
        // 1. Process assigned to THIS chef
        // 2. Process with NO assignment (first in queue)
        let pIndex = queue.findIndex(p => p.chef_id === chefId);

        // If not found, look for unassigned tasks
        if (pIndex === -1) {
          pIndex = queue.findIndex(p => !p.chef_id);
        }

        if (pIndex !== -1) {
          const p = queue.splice(pIndex, 1)[0];
          if (p.startTime === null) p.startTime = this.currentTime;
          activeTasks.push({
            process: p,
            quantumRemaining: this.timeQuantum,
            chefId: chefId
          });
        }
      }

      if (activeTasks.length === 0) break;

      // Find the next event time
      let timeToNextEvent = Infinity;
      activeTasks.forEach(task => {
        timeToNextEvent = Math.min(timeToNextEvent, task.process.remainingTime, task.quantumRemaining);
      });

      // Advance time
      this.currentTime += timeToNextEvent;

      // Update wait time for those in queue
      queue.forEach(p => {
        p.totalWait += timeToNextEvent;
      });

      // Update active tasks
      for (let i = activeTasks.length - 1; i >= 0; i--) {
        const task = activeTasks[i];
        task.process.remainingTime -= timeToNextEvent;
        task.quantumRemaining -= timeToNextEvent;

        if (task.process.remainingTime <= 0) {
          task.process.completionTime = this.currentTime;
          task.process.assignedToChef = task.chefId;
          completed.push(activeTasks.splice(i, 1)[0].process);
        } else if (task.quantumRemaining <= 0) {
          queue.push(activeTasks.splice(i, 1)[0].process);
        }
      }

      const reward = -this.getStateAvgWait();
      const nextState = this.getState();
      this.updateQValue(state, action, reward, nextState);
    }

    return {
      completed,
      totalHospitalityTime: this.currentTime,
      finalQuantum: this.timeQuantum,
      qTable: this.qTable
    };
  }


  getStateAvgWait() {
    return this.processes.reduce((acc, p) => acc + (p.totalWait || 0), 0) / (this.processes.length || 1);
  }
}

module.exports = HybridScheduler;
