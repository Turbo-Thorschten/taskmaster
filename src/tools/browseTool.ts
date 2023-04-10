import axios, { AxiosResponse } from 'axios'
import { Tool, ToolError } from '@/types/Tool'
import { RecursiveCharacterTextSplitter, TokenTextSplitter } from 'langchain/text_splitter'
import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'
import { compressKnowledge } from '@/taskWorker'
import * as cheerio from 'cheerio';

function extractTextWithLinks(htmlString: string) {
    const $ = cheerio.load(htmlString);

    // Replace a tags with custom placeholders
    $('a').each(function () {
        const link = $(this);
        link.replaceWith(`{{a href="${link.attr('href')}"}}${link.text()}{{/a}}`);
    });

    return $('body').text().replace(/[\n\s]+/g, " ").replace(/[\n\s]+/g, " ");
}

export class BrowseTool implements Tool<string, string> {
    private readonly _splitter = new TokenTextSplitter({chunkSize: 1900, chunkOverlap: 100, encodingName: "cl100k_base"});

    async call(arg: string[]): Promise<ToolError | string> {
        try {
            const response: AxiosResponse = await axios.get(arg[0])
            if (response.status !== 200) {
                return new ToolError(`The website ${arg[0]} returned the status code ${response.status}`);
            }

            const docs = await this._splitter.createDocuments([extractTextWithLinks(response.data)], [{url: arg[0]}]);
            if (docs.length > 10) {
                return "The website is too big to be processed."
            }

            const gpt35 = new ChatOpenAI({modelName: "gpt-3.5-turbo", verbose: true, maxTokens: 2000});

            const systemMessage = new SystemChatMessage(`You search for relevant information in this website data 
                in regards to the following task: ${arg[1]}
                Say if the data is relevant. If the data is relevant return the relevant stuff (code, text, etc.).
                Answer short and precisely but don't skip anything that may help.`);
            systemMessage.name = "AI";

            const resultsForChunks: string[] = [];
            const promises = docs.map(async (doc) => {
                const humanMessage = new HumanChatMessage(doc.pageContent);
                humanMessage.name = "human";

                const gptAnswer = await gpt35.call([systemMessage, humanMessage]);
                resultsForChunks.push(gptAnswer.text);
            });

            await Promise.all(promises);


            const humanMessage = new HumanChatMessage(`
            You have all the relevant data together. Here is a list of results for each chunked part of the website:
            
            ${resultsForChunks.map((r, i) => `Chunk ${i}: ${r}`).join('\n')}
            
            Now you have to combine all the results and return the relevant information in regards to the task.
            `);
            const gpt4 = new ChatOpenAI({modelName: "gpt-4", verbose: true, maxTokens: 2000});

            const finalResult = await gpt4.call([systemMessage, humanMessage]);

            return Promise.resolve(finalResult.text);
        }
        catch (e) {
            console.warn(e);
            return `An error occurred browsing to ${arg[0]}`
        }
    }


    description = (): string => 'This tool browses accepts an url and returns the relevant parts of the site in regards to prompt.'
    name = (): string => 'Browse Tool'
    argumentDescription = (): string => '<arg1>: The URL to browse to. <arg2>: The original prompt of the task.'

}