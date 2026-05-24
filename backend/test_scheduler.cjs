const HybridScheduler = require("./scheduler.cjs");

// Mock processes (orders)
const processes = [
    { id: "Order 1", burstTime: 10 }, // 10 mins
    { id: "Order 2", burstTime: 20 }, // 20 mins
    { id: "Order 3", burstTime: 15 }, // 15 mins
    { id: "Order 4", burstTime: 5 },  // 5 mins
    { id: "Order 5", burstTime: 12 }  // 12 mins
];

console.log("--- Testing with 1 Chef ---");
const scheduler1 = new HybridScheduler(processes, { numChefs: 1, initialQuantum: 5 });
const result1 = scheduler1.run();
console.log("Total Time:", result1.totalHospitalityTime);
console.log("Completions:", result1.completed.map(p => `${p.id}: ${p.completionTime}`));

console.log("\n--- Testing with 3 Chefs ---");
const scheduler3 = new HybridScheduler(processes, { numChefs: 3, initialQuantum: 5 });
const result3 = scheduler3.run();
console.log("Total Time:", result3.totalHospitalityTime);
console.log("Completions:", result3.completed.map(p => `${p.id}: ${p.completionTime}`));

console.log("\n--- Testing with historical factor 1.5 (Busy Kitchen) ---");
const schedulerBusy = new HybridScheduler(processes, { numChefs: 3, initialQuantum: 5, historicalWaitFactor: 1.5 });
const resultBusy = schedulerBusy.run();
console.log("Total Time:", resultBusy.totalHospitalityTime);
console.log("Completions:", resultBusy.completed.map(p => `${p.id}: ${p.completionTime}`));
