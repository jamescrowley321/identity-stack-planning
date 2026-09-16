import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const IM = 'https://github.com/jamescrowley321/identity-model';

/** Stated in the hero, each one checkable against a link in the section below. */
const EVIDENCE = [
  {figure: '3', label: 'native languages'},
  {figure: '119', label: 'shared conformance cases'},
  {figure: '12', label: 'capabilities, each RFC-referenced'},
];

const INSTALLS = [
  {lang: 'Python', cmd: 'pip install py-identity-model', note: 'OpenID Certified. Full Core and Extended surface.'},
  {lang: 'Go', cmd: 'go get github.com/jamescrowley321/identity-model/go', note: 'Core and Extended: introspection, revocation, token exchange, DPoP.'},
  {lang: 'Rust', cmd: 'cargo add rs-identity-model', note: 'Core and introspection. Revocation, token exchange and DPoP in progress.'},
  {lang: 'Node', cmd: null, note: 'Planned.'},
];

const PROOF = [
  {
    stat: '119',
    unit: 'cases written once, run by all three',
    body: 'Across twelve capabilities, as language-neutral JSON: inputs and expected outcomes expressed as canonical cross-language error codes. Exactly one case cannot be a static vector — a live JWKS refresh — and is marked native with a stated reason.',
  },
  {
    stat: '0',
    unit: 'cases a language may skip',
    body: 'A language that marks a capability implemented must execute every vector for it. The coverage gate fails CI if a runner silently drops one, so the capability matrix cannot claim more than the code does.',
  },
  {
    stat: '4',
    unit: 'providers in the conformance harness',
    body: 'Keycloak, IdentityServer, node-oidc-provider and Descope run locally from one compose file, alongside the OpenID Foundation’s hosted suite. No provider is privileged, and none of them is the definition of correct.',
  },
];

const PHASES = ['setup', 'analyze', 'implement', 'test', 'review', 'review-fix', 'pr', 'docs', 'ci', 'complete'];

const TRACKS = [
  {
    name: 'Library',
    goal: 'A credible, certified, multi-language open-source identity library.',
    done: 'Certification breadth grows and cross-language parity holds.',
    where: {label: 'identity-model', href: IM},
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
    where: {label: 'terraform-provider-descope', href: 'https://github.com/jamescrowley321/terraform-provider-descope'},
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
      title="One identity client library, in every language"
      description="identity-model implements OpenID Connect and OAuth 2.0 natively in Python, Go and Rust — one design, held to 119 shared conformance cases, with the Python library certified by the OpenID Foundation as a Relying Party.">
      <header className={styles.hero}>
        <div className={styles.inner}>
          <h1 className={styles.heroTitle}>
            One identity client.
            <br />
            Every language you ship.
          </h1>
          <p className={styles.heroLede}>
            Stop assembling an OAuth stack per language. <strong>identity-model</strong>{' '}
            implements OpenID Connect and OAuth 2.0 natively in Python, Go and Rust — one
            design, one capability surface, and a single executable specification all three
            must pass.
          </p>

          <ul className={styles.evidence}>
            {EVIDENCE.map((e) => (
              <li key={e.label}>
                <span className={styles.evidenceFigure}>{e.figure}</span>
                <span className={styles.evidenceLabel}>{e.label}</span>
              </li>
            ))}
            <li className={styles.evidenceCert}>
              <span className={styles.evidenceFigure}>OpenID Certified®</span>
              <span className={styles.evidenceLabel}>
                Relying Party — Basic, Config, Form Post Basic, 2 July 2026
              </span>
            </li>
          </ul>

          <div className={styles.heroActions}>
            <Link className={styles.actionPrimary} href={IM}>
              Get the library
            </Link>
            <Link className={styles.actionSecondary} href={`${IM}/blob/main/spec/capabilities.md`}>
              Capability matrix
            </Link>
          </div>
        </div>
      </header>

      {/* The problem, then the shape of the answer */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>
            Writing an OAuth client should not mean rebuilding it per language.
          </h2>
          <div className={styles.prose}>
            <p>
              Building an OpenID Connect or OAuth 2.0 <em>client</em> usually means gluing
              together three or four half-overlapping libraries in every language you use — one
              for JWTs, another for discovery, a third for the flows. Each has its own quirks
              and its own gaps, and none of it transfers to the next service written in a
              different language.
            </p>
            <p>
              identity-model is one library instead. Every capability maps to a specific RFC or
              OpenID Connect section rather than to a vendor's happy path, and each
              implementation is real idiomatic code in its own language — on{' '}
              <code>httpx</code>, <code>net/http</code> and <code>reqwest</code> — not bindings
              over a shared runtime. Move a service from Python to Go and the mental model
              comes with you.
            </p>
            <p>
              It is provider-agnostic: Keycloak, IdentityServer, Okta, Auth0, Entra, Descope, or
              anything else that follows the specifications.
            </p>
          </div>

          <div className={styles.installs}>
            {INSTALLS.map((i) => (
              <div key={i.lang} className={styles.install}>
                <p className={styles.installLang}>{i.lang}</p>
                {i.cmd && <code className={styles.installCmd}>{i.cmd}</code>}
                <p className={styles.installNote}>{i.note}</p>
              </div>
            ))}
          </div>

          <p className={styles.proseAside}>
            It is a protocol client: it talks to identity providers. It is not an identity
            provider or an authorization server, and it is not framework middleware — though{' '}
            <code>fastapi-identity-model</code> is built on top of it.
          </p>
        </div>
      </section>

      {/* The claim that needs proving, and the proof */}
      <section className={styles.sectionAlt}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>
            &ldquo;Behaves the same everywhere&rdquo; is only worth something if it is enforced.
          </h2>
          <p className={styles.sectionLede}>
            Plenty of projects ship libraries in several languages and hope they agree. Here,
            what <em>correct</em> means lives outside every implementation — in a
            language-neutral specification that all three execute, with CI failing if one of
            them quietly does not.
          </p>

          <div className={styles.stats}>
            {PROOF.map((p) => (
              <div key={p.unit} className={styles.stat}>
                <p className={styles.statFigure}>
                  {p.stat}
                  <span className={styles.statUnit}>{p.unit}</span>
                </p>
                <p className={styles.statBody}>{p.body}</p>
              </div>
            ))}
          </div>

          <p className={styles.sectionNote}>
            The Python library is certified by the OpenID Foundation as a Relying Party, and
            that certification is the reference the Go and Rust implementations are built to
            match. The authoritative per-language status is the{' '}
            <Link href={`${IM}/blob/main/spec/capabilities.md`}>capability matrix</Link> in{' '}
            <Link href={`${IM}/tree/main/spec`}>
              <code>spec/</code>
            </Link>
            , not this page.
          </p>
        </div>
      </section>

      {/* How it gets built — supporting, not the lead */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>Built by agents, reviewed by agents that never saw the code</h2>
          <p className={styles.sectionLede}>
            This repository is the reasoning behind the library — the architecture, the
            identity-domain research, and the prompts that run the work. A loop takes one story
            through a fixed pipeline, completing exactly one phase per iteration and writing its
            state to disk before it exits, so a crash resumes instead of restarting and every
            phase begins with a fresh context.
          </p>

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

          <div className={styles.prose}>
            <p>
              Review is the phase that had to change. Reviews once ran in the context that wrote
              the code and were shallow — they confirmed their own work. Four pull requests that
              passed that way were re-reviewed cold and turned out to carry cross-tenant IDOR,
              privilege escalation and resource leaks. For a library whose job is deciding
              whether a token is valid, that is not a tolerable failure mode.
            </p>
            <p>
              Five reviewers now run against every change, each in a fresh context with no access
              to the implementation plan, the task state, or the conversation that produced the
              diff: cold read, edge cases, acceptance criteria, security review, and a red team
              on anything touching auth or middleware. Blocking findings are fixed before a pull
              request opens, and a loop never merges its own — a person does that.
            </p>
          </div>

          <p className={styles.sectionNote}>
            <Link to="/docs/ralph-loop-process">How a story becomes a merged pull request</Link> ·{' '}
            <Link to="/docs/review-process">the review process in full</Link>
          </p>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>Four tracks, running independently</h2>
          <p className={styles.sectionLede}>
            The library is the flagship; the other three exist to keep it honest, keep the
            tooling working, and test one idea that is deliberately not being built yet.
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
                decomposition; they never say whether something is done. Two markdown trackers
                were retired for drifting from the issues they duplicated — at retirement, 34
                rows across them were marked pending against closed issues.
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
                order, and <a href="/identity-stack-planning/workspace.yml">workspace.yml</a> for
                the repository mapping and track facts as structured data.
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
