import axios, { AxiosResponse } from 'axios'
import { Tool, ToolError } from '@/types/Tool'
import google from 'googlethis'
import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'
import { CallbackManager, ConsoleCallbackHandler } from 'langchain/callbacks'

const callbackManager = new CallbackManager()
callbackManager.addHandler(new ConsoleCallbackHandler())
export const chat = new ChatOpenAI({modelName: "gpt-4", verbose: true, maxTokens: 4000, callbackManager});

export class GoogleTool implements Tool<string, string> {

    description = (): string => 'This tool googles the web and returns the google search result.'
    name = (): string => 'Google Tool'
    argumentDescription = (): string => '<arg1>: The search term <arg2>: The original prompt of the task.'

    async call(arg: string[]): Promise<ToolError | string> {
        try {
            const options = {
                page: 0,
                safe: false, // Safe Search
                parse_ads: false, // If set to true sponsored results will be parsed
                additional_params: {
                    // add additional parameters here, see https://moz.com/blog/the-ultimate-guide-to-the-google-search-parameters and https://www.seoquake.com/blog/google-search-param/
                    hl: 'en',
                },
            }

            const response = await google.search(arg[0], options)
            const result: { description: string; title: string; url: string }[] =  response.results.map(rs => ({title: rs.title, description: rs.description,url: rs.url}))


            const systemMessage = new SystemChatMessage(`
            You will receive a list of search results. You have to filter and process 
            those results in regards to the prompt you receive at the end of the request.
            Leave out all the results that are probably not helpful in solving the task.
            `);
            systemMessage.name = "AI";

            const humanMessage = new HumanChatMessage(`
            The search results: ${result.map(r => `
                Title: ${r.title}
                Description: ${r.description}
                URL: ${r.url}`).join('\n')}
            Return only the relevant sites and throw away irrelevant information in regards to solving
            this task: ${arg[1]}`,
            );
            humanMessage.name = "human";

            const gptAnswer = await chat.call([systemMessage, humanMessage]);

            return Promise.resolve(gptAnswer.text)
        }
        catch (e) {
            return Promise.resolve(new ToolError("Could not search for " + arg[0]))
        }
    }

}