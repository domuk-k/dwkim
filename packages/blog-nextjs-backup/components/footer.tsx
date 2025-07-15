import { ModeToggle } from '@/components/mode-toggle';

const routes = [
  { name: '블로그', enabled: false, href: '/posts' },
  { name: '독서목록', enabled: false, href: '/library' },
  { name: '깃허브', enabled: true, href: 'https://github.com/domuk-k' },
  {
    name: '소스코드 보기',
    enabled: false,
    href: 'https://github.com/domuk-k/self',
  },
];

export default function Footer() {
  return (
    <footer>
      <div className="text-sm mt-8 flex flex-wrap justify-between items-center space-y-2 text-neutral-600 md:flex-row md:space-x-4 md:space-y-0 dark:text-neutral-300 ">
        <ul className="flex gap-4">
          {routes.map(
            (route) =>
              route.enabled && (
                <li key={route.href}>
                  <a
                    className="flex items-center hover:text-neutral-800 dark:hover:text-neutral-100"
                    rel="noopener noreferrer"
                    target={
                      route.href.startsWith('http') ? '_blank' : undefined
                    }
                    href={route.href}
                  >
                    <p className="mr-1 font-xs">{route.name}</p>
                    <ArrowIcon />
                  </a>
                </li>
              ),
          )}
        </ul>
        <ModeToggle />
      </div>
    </footer>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="6"
      height="6"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="self-end"
    >
      <path
        d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
        fill="currentColor"
      />
    </svg>
  );
}
