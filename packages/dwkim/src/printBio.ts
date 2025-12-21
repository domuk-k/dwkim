import boxen, { type Options } from 'boxen';
import chalk from 'chalk';

/**
 * 명함 출력 함수 - 프로필 정보를 기반으로 명함을 출력합니다.
 */
export function printProfile() {
  const boxenOptions: Options = {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: 'green',
  };

  const cardContent = [
    `${chalk.white.bold(profile.name)} ${chalk.gray(profile.title)}`,
    chalk.white(profile.bio),
    '',
    `${chalk.gray.greenBright('Email')} ${profile.email}`,
    `${chalk.gray.greenBright('GitHub')} ${profile.github}`,
    `${chalk.gray.greenBright('Website')} ${profile.website}`,
    `${chalk.gray.greenBright('Project')} ${profile.project}`,
    '',
    chalk.white(profile.quote),
  ].join('\n');

  console.log(boxen(cardContent, boxenOptions));

  // CTA: 채팅 기능 안내
  console.log('');
  console.log(
    chalk.cyan('💬 Want to know more about me? Run ') +
      chalk.white.bold('dwkim chat') +
      chalk.cyan(' to ask questions!')
  );
  console.log(
    chalk.gray('   Example: "What technologies do you use?" or "Tell me about your experience"')
  );
}

export const profile = {
  id: '1',
  name: '김동욱',
  email: 'dannyworks102@gmail.com',
  title: 'Software Engineer, BHSN.ai',
  github: 'https://github.com/domuk-k',
  website: 'https://domuk-k.vercel.app',
  project: 'https://github.com/domuk-k/dwkim',
  bio: 'Problem Solver 🤹, Marathon Runner 🏃, Opensource committer 💻, casual Yogi 🧘',
  quote: 'Customer Centric, Focus on what you can control',
} as const;
