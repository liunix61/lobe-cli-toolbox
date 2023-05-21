import chalk from 'chalk';
import { ChatGPTAPI } from 'chatgpt';
import { execSync } from 'child_process';
import 'isomorphic-fetch';
import { CONFIG_NAME, default as storeConfig } from '../constants/config';
import gitmojis from '../constants/gitmojis';

const typesExample = gitmojis.map((item) => `- ${item.type}: ${item.descEN}`).join('\n');
const genPrompt = (diff: string): string => {
  const custionPrompt: string | any = storeConfig.get(CONFIG_NAME.PROMPT);
  const maxLength: number | any = storeConfig.get(CONFIG_NAME.MAX_LENGTH);
  const locale: number | any = storeConfig.get(CONFIG_NAME.LOCALE);
  const diffLength: number | any = storeConfig.get(CONFIG_NAME.DIFF_LENGTH);

  let prompt: string =
    `I want you to act as the author of a commit message in git.` +
    `I'll enter a git diff, and your job is to convert it into a useful commit message.` +
    `Do not preface the commit with anything, use the present tense, use the conventional commits specification <type>(<optional scope>): <subject>`;
  if (custionPrompt) prompt = custionPrompt;

  const finalPrompt = [
    prompt,
    locale && `Commit message language: ${locale}`,
    `Commit message must be a maximum of ${maxLength} characters.`,
    `Choose only one type from the type-to-description below:`,
    typesExample,
    `Return pure commit message describes the git diff: `,
  ]
    .filter(Boolean)
    .join('\n');

  let diffMessage = diff;
  if (diffMessage.length > diffLength - finalPrompt.length) {
    diffMessage = diff.substring(0, diffLength - finalPrompt.length);
  }

  return [finalPrompt, diffMessage].filter(Boolean).join('\n');
};

const addEmoji = (message: string) => {
  const [type, ...rest]: any = message.split(': ');
  let emoji: string = '🔧';
  gitmojis.forEach((item) => {
    if (type.includes(item.type)) emoji = item.emoji;
  });
  return `${emoji} ${type}: ${rest.join(': ')}`;
};

export default async () => {
  const apiKey: string | any = storeConfig.get(CONFIG_NAME.OPENAI_TOKEN);

  if (!apiKey) {
    console.log(chalk.red.bgBlack(' 🤯 Please set the OpenAI Token by lobe-commit --config '));
    process.exit(1);
    return;
  }

  let diff = execSync('git diff --staged').toString();

  if (!diff) {
    console.log(chalk.yellow.bgBlack(' 🤯 No changes to commit '));
    process.exit(1);
  }

  const apiBaseUrl: any = storeConfig.get('apiBaseUrl');
  const api = new ChatGPTAPI(
    apiBaseUrl
      ? {
          apiKey,
          apiBaseUrl,
        }
      : { apiKey },
  );

  const timeoutMs: number | any = storeConfig.get(CONFIG_NAME.TIMEOUT);
  const { text } = await api.sendMessage(genPrompt(diff), {
    timeoutMs,
  });

  return addEmoji(text);
};
