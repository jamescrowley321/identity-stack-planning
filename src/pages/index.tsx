import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

/** The real pipeline. One phase per iteration, state persisted between them. */
const PHASES = [
  'setup',
  'analyze',
  'implement',
  'test',
  'review',
  'review-fix',
  'pr',
  'docs',
  'ci',
  'complete',
];

const LENSES = [
  {name: 'Cold Read', catches: 'Logic errors, swallowed exceptions, injection, race conditions, resource leaks. Sees the diff and nothing else.'},
  {name: 'Edge Cases', catches: 'Every branch and boundary walked: null, empty, zero-length, max int, unhandled async, integration failures.'},
  {name: 'Acceptance Criteria', catches: 'Criteria specified but not implemented, implemented but not tested, or quietly drifted from.'},
  {name: 'Security Review', catches: 'Tenant isolation, auth bypass, access control, credential exposure, JWT attacks.'},
  {name: 'Red Team', catches: 'Small weaknesses chained into privilege escalation or exfiltration. Runs on auth and middleware changes.'},
];

const TRACKS = [
  {
    name: 'Library',
    goal: 'A credible, certified, multi-language open-source identity library.',
    done: 'Certification breadth grows and cross-language parity holds.',
    where: {label: 'identity-model', href: 'https://github.com/jamescrowley321/identity-model'},
    tone: 'library',
  },
  {
    name: 'Proving ground',
    goal: 'Run the library against real providers end to end, not just against test doubles.',
    done: 'The library is proven in a working application, against more than one provider.',
    where: {label: 'identity-stack', href: 'https://github.com/jamescrowley321/identity-stack'},
    tone: 'proving',
  },
  {
    name: 'Expertise',
    goal: 'Keep provider tooling and repository governance in working order.',
    done: 'Provider infrastructure stays reproducible from Terraform, not from a console.',
    where: {
      label: 'terraform-provider-descope',
      href: 'https://github.com/jamescrowley321/terraform-provider-descope',
    },
    tone: 'expertise',
  },
  {
    name: 'Governed brain',
    goal: 'Test the thesis that agent memory is an authorization problem.',
    done: 'The four open decisions are settled so phase 0 can start.',
    where: {label: 'Research, gated', href: '/docs/governed-brain-where-it-stands'},
    tone: 'brain',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="Agentic engineering, with identity standards as the product"
      description="A working implementation of agentic software engineering: agents plan, execute and adversarially review the work across four repositories, and what they ship is OIDC and OAuth 2.0 software held to the specs.">
      <header className={styles.hero}>
        <div className={styles.inner}>
          <h1 className={styles.heroTitle}>Identity Stack Brain</h1>
          <p className={styles.heroLede}>
            Agentic software engineering, with identity standards as the product.
          </p>
          <p className={styles.heroBody}>
            Agents plan the work, run it to a pull request across four repositories, and
            review it in fresh contexts that never saw the implementation. What they ship is
            OIDC and OAuth 2.0 software held to the specifications — including a relying
            party certified by the OpenID Foundation. This repository is the reasoning: no
            application code, only the plans, the domain research, and the prompts.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.actionPrimary} to="/docs/ralph-loop-process">
              How the loop works
            </Link>
            <Link className={styles.actionSecondary} to="/docs/roadmap">
              What is being built
            </Link>
          </div>

          <div className={styles.pipeline} aria-label="Loop phases, in order">
            {PHASES.map((phase) => (
              <span
                key={phase}
                className={styles.phase}
                data-emphasis={phase === 'review' ? 'true' : undefined}>
                {phase}
              </span>
            ))}
          </div>
          <p className={styles.pipelineNote}>
            One phase per iteration. State is written to disk between them, so a crash
            resumes instead of restarting.
          </p>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>Review is the part that had to change</h2>
          <p className={styles.sectionLede}>
            Reviews used to run in the same context that wrote the code, and they were
            shallow — they confirmed their own work. Four pull requests that passed that way
            were re-reviewed cold and turned out to carry cross-tenant IDOR, privilege
            escalation, and resource leaks. Every reviewer now starts fresh, with no access
            to the implementation plan, the task state, or the conversation that produced the
            diff.
          </p>
          <dl className={styles.lenses}>
            {LENSES.map((lens) => (
              <div key={lens.name} className={styles.lens}>
                <dt className={styles.lensName}>{lens.name}</dt>
                <dd className={styles.lensBody}>{lens.catches}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.sectionNote}>
            Blocking findings are fixed before a pull request opens, and a loop never merges
            its own. <Link to="/docs/review-process">The review process in full</Link>.
          </p>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>What it builds</h2>
          <p className={styles.sectionLede}>
            Four tracks, each with its own goal and its own test of done, running
            independently. The library is provider-agnostic by design: one conformance suite
            runs it against Keycloak, IdentityServer, node-oidc-provider and Descope, and no
            provider is privileged. The others are implementations of the same standards, not
            the point of them.
          </p>

          <div className={styles.lanes}>
            {TRACKS.map((track) => (
              <article key={track.name} className={styles.lane} data-tone={track.tone}>
                <h3 className={styles.laneName}>{track.name}</h3>
                <p className={styles.laneGoal}>
                  <span className={styles.laneLabel}>Goal</span>
                  {track.goal}
                </p>
                <p className={styles.laneDone}>
                  <span className={styles.laneLabel}>Done looks like</span>
                  {track.done}
                </p>
                <p className={styles.laneWhere}>
                  <Link to={track.where.href}>{track.where.label}</Link>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.split}>
            <div>
              <h2 className={styles.sectionTitle}>Where status lives</h2>
              <p className={styles.sectionLede}>
                GitHub issues, and nowhere else. These documents hold the reasoning and the
                decomposition; they never say whether something is done. Two markdown
                trackers were retired for drifting from the issues they duplicated — at
                retirement, 34 rows across them were marked pending against closed issues.
              </p>
              <Link
                className={styles.actionSecondary}
                href="https://github.com/jamescrowley321/identity-stack-planning/issues">
                Open issues
              </Link>
            </div>
            <div>
              <h2 className={styles.sectionTitle}>If you are an agent</h2>
              <p className={styles.sectionLede}>
                Start at <code>AGENTS.md</code>. It carries what is authoritative, how work is
                named, which sibling checkout to ground against and which one is an archived
                trap, and what must not be touched. Two files publish at the site root to be
                fetched rather than read:{' '}
                <a href="/identity-stack-planning/llms.txt">llms.txt</a> for a curated reading
                order, and{' '}
                <a href="/identity-stack-planning/workspace.yml">workspace.yml</a> for the
                repository mapping and track facts as structured data.
              </p>
              <Link
                className={styles.actionSecondary}
                href="https://github.com/jamescrowley321/identity-stack-planning/blob/main/AGENTS.md">
                Read AGENTS.md
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
