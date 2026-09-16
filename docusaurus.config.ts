import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Identity Stack Brain',
  tagline: 'The planning repo for a multi-repo identity platform. No application code.',
  favicon: 'img/favicon.svg',

  future: {v4: true},

  url: 'https://jamescrowley321.github.io',
  baseUrl: '/identity-stack-planning/',
  organizationName: 'jamescrowley321',
  projectName: 'identity-stack-planning',

  // A dead link is the failure this repository is least able to afford: the README
  // shipped a Quick Start pointing at a deleted file for months. Fail the publish.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  i18n: {defaultLocale: 'en', locales: ['en']},

  markdown: {
    // `.md` parses as CommonMark, `.mdx` as MDX. Six documents carry `{project_id}`,
    // `{dsl}`, `{pid}` and `{AccessKeySecret}`, and the corpus has 35 unclosed <br>
    // tags — every one of which is a JSX error under the default `mdx` format.
    format: 'detect',
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap',
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/jamescrowley321/identity-stack-planning/tree/main/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {respectPrefersColorScheme: true},
    mermaid: {
      theme: {light: 'base', dark: 'base'},
      options: {
        themeVariables: {
          primaryColor: '#e9e3fb',
          primaryTextColor: '#221a33',
          primaryBorderColor: '#6d4bd8',
          lineColor: '#8b6fe0',
          secondaryColor: '#f3effd',
          tertiaryColor: '#faf8ff',
          fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
        },
      },
    },
    image: 'img/social-card.png',
    navbar: {
      title: 'Identity Stack Brain',
      logo: {alt: '', src: 'img/logo.svg'},
      items: [
        {type: 'docSidebar', sidebarId: 'planning', position: 'left', label: 'Documentation'},
        {to: '/docs/roadmap', label: 'Program map', position: 'left'},
        {to: '/docs/governed-brain-where-it-stands', label: 'Governed brain', position: 'left'},
        {
          href: 'https://github.com/jamescrowley321/identity-stack-planning/issues',
          label: 'Status',
          position: 'right',
        },
        {
          href: 'https://github.com/jamescrowley321/identity-stack-planning',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Read',
          items: [
            {label: 'Program map', to: '/docs/roadmap'},
            {label: 'System architecture', to: '/docs/system-architecture'},
            {label: 'IdP authorization comparison', to: '/docs/idp-rbac-comparison'},
            {label: 'Glossary', to: '/docs/glossary'},
          ],
        },
        {
          title: 'Repositories',
          items: [
            {label: 'identity-model', href: 'https://github.com/jamescrowley321/identity-model'},
            {label: 'identity-stack', href: 'https://github.com/jamescrowley321/identity-stack'},
            {
              label: 'terraform-provider-descope',
              href: 'https://github.com/jamescrowley321/terraform-provider-descope',
            },
          ],
        },
        {
          title: 'For agents',
          items: [
            {
              label: 'AGENTS.md',
              href: 'https://github.com/jamescrowley321/identity-stack-planning/blob/main/AGENTS.md',
            },
            {
              label: 'llms.txt',
              href: 'https://jamescrowley321.github.io/identity-stack-planning/llms.txt',
            },
            {
              label: 'workspace.yml',
              href: 'https://jamescrowley321.github.io/identity-stack-planning/workspace.yml',
            },
            {
              label: 'Contributing',
              href: 'https://github.com/jamescrowley321/identity-stack-planning/blob/main/CONTRIBUTING.md',
            },
          ],
        },
      ],
      copyright:
        'Apache 2.0, James Crowley. Status lives in GitHub issues, never in these pages.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'hcl', 'python', 'go', 'rust'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
