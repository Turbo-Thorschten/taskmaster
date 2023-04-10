import * as readline from 'readline';
import { TaskWorker } from '@/taskWorker'
//
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
//
// rl.question("What's your task.? Describe in great detail. Also type in every knowledge you have about the task that may be useful.", async (answer: string) => {
//     console.log(`Your task: ${answer}`);
//     console.log("Let's go!")
//     const taskWorker = new TaskWorker(answer);
//     await taskWorker.run();
//     rl.close();
// });

const taskWorker = new TaskWorker("Program the game connect 4 in node.js and run the game afterwards.");
await taskWorker.run();