import { CopyButton } from '@/components/CopyButton';
import { CopyIcon } from 'lucide-react';
import { useMDXComponent } from 'next-contentlayer/hooks';
import Image from 'next/image';
import Link from 'next/link';
import {
  type DetailedHTMLProps,
  type HTMLAttributes,
  createElement,
} from 'react';
import { highlight } from 'sugar-high';

const generateUUID = () => crypto.randomUUID();

type MDXComponents = React.ComponentProps<
  ReturnType<typeof useMDXComponent>
>['components'];

type ItemOfMDXComponents = MDXComponents[keyof MDXComponents];

function Table({ data }: { data: { headers: string[]; rows: string[][] } }) {
  const headers = data.headers.map((header, index) => (
    <th key={generateUUID()}>{header}</th>
  ));
  const rows = data.rows.map((row, index) => (
    <tr key={generateUUID()}>
      {row.map((cell, cellIndex) => (
        <td key={generateUUID()}>{cell}</td>
      ))}
    </tr>
  ));

  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

function CustomLink(props: React.ComponentProps<typeof Link>) {
  const href = props.href;

  if (href.toString().startsWith('/')) {
    return (
      <Link {...props} href={href}>
        {props.children}
      </Link>
    );
  }
  if (href.toString().startsWith('#')) {
    return <a {...props} href={href.toString()} />;
  }
  return (
    <a
      target="_blank"
      className="cursor-alias"
      rel="noopener noreferrer"
      {...props}
      href={href.toString()}
    />
  );
}

function RoundedImage(props: React.ComponentProps<typeof Image>) {
  return <Image className="rounded-lg" {...props} alt={props.alt} />;
}

function Code({
  children,
  className,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>) {
  const codeHTML = typeof children === 'string' ? highlight(children) : '';

  return (
    <>
      <div className="relative">
        <div className="absolute right-0 top-0">
          <CopyButton target={children as string} />
        </div>
      </div>
      <code
        id="custom-code-block"
        {...props}
        ref={props.ref as React.Ref<HTMLDivElement>}
        // biome-ignore lint/security/noDangerouslySetInnerHtml:
        dangerouslySetInnerHTML={{ __html: codeHTML }}
      />
    </>
  );
}

function slugify(str: string) {
  return str
    .toString()
    .toLowerCase()
    .trim() // Remove whitespace from both ends of a string
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters except for -
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

function createHeading(level: number) {
  const Heading = ({ children }: { children?: React.ReactNode }) => {
    const slug = children ? slugify(String(children)) : '';
    return createElement(
      `h${level}`,
      { id: slug },
      [
        createElement('a', {
          href: `#${slug}`,
          key: `link-${slug}`,
          className: 'anchor',
        }),
      ],
      children,
    );
  };

  Heading.displayName = `Heading${level}`;

  return Heading;
}

function Details(props: React.HTMLAttributes<HTMLDetailsElement>) {
  return <details className="my-4" {...props} />;
}

function Summary(props: React.HTMLAttributes<HTMLElement>) {
  return <summary className="cursor-pointer font-semibold" {...props} />;
}

const components: MDXComponents = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  Image: RoundedImage,
  a: CustomLink as ItemOfMDXComponents,
  code: Code,
  Table,
  details: Details as ItemOfMDXComponents,
  summary: Summary as ItemOfMDXComponents,
};

interface MdxProps {
  code: string;
}

export function Mdx({ code }: MdxProps) {
  const Component = useMDXComponent(code);

  return <Component components={components} />;
}
