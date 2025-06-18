import boxen, { type Options } from 'boxen';
import chalk from 'chalk';

interface Profile {
  name: string;
  email: string;
  title: string;
  github: string;
  website: string;
  bio: string;
  quote: string;
}
/**
 * 명함 출력 함수 - 프로필 정보를 기반으로 명함을 출력합니다.
 */
export function printBio(profile: Profile) {
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
    '',
    chalk.white(profile.quote),
  ].join('\n');

  console.log(boxen(cardContent, boxenOptions));
}
