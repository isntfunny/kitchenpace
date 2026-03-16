import { hatchet } from '../hatchet';

export const helloWorldWorkflow = hatchet.workflow({
    name: 'hello-world',
});

helloWorldWorkflow.task({
    name: 'greet',
    fn: async (input: { message?: string }) => {
        console.log(`[HelloWorld] ${input.message ?? 'Hello from Hatchet!'}`);
        return { greeting: input.message ?? 'Hello!', timestamp: new Date().toISOString() };
    },
});
