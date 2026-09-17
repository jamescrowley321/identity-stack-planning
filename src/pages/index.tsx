import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import CodeBlock from '@theme/CodeBlock';
import Verdict from '@site/src/components/Verdict';
import styles from './index.module.css';

const IM = 'https://github.com/jamescrowley321/identity-model';
const IM_DOCS = 'https://jamescrowley321.github.io/identity-model/';

const PY = `from py_identity_model import TokenValidationConfig, validate_token

claims = validate_token(
    jwt=token,
    token_validation_config=TokenValidationConfig(
        perform_disco=True, audience="my-api"
    ),
    disco_doc_address="https://issuer.example.com",
)`;

const GO = `import "github.com/jamescrowley321/identity-model/go/pkg/jwt"

claims, err := jwt.Validate(ctx, rawToken, keySet,
    jwt.WithIssuer("https://issuer.example.com"),
    jwt.WithAudience("my-api"),
)`;

const RUST = `use rs_identity_model::{ValidationOptions, validate_token_with_jwks};

let claims = validate_token_with_jwks(
    &token,
    &jwks,
    &ValidationOptions::new()
        .issuer("https://issuer.example.com")
        .audience("my-api"),
)?;`;

const BODIES = [
  {
    title: 'Authorization across nine identity providers',
    body: 'RBAC and ReBAC compared provider by provider, ending in a position: the application owns roles in Postgres, and relationship authorization is proxied to a Zanzibar engine rather than owned. The cases where a simpler model wins are named too.',
    to: '/docs/idp-rbac-comparison',
  },
  {
    title: 'What a certification programme actually costs',
    body: 'Which profiles are certified, why the hosted OpenID Foundation suite is the standing conformance standard rather than a local harness, and which profiles are built but not yet submitted.',
    to: '/docs/oidc-certification-analysis',
  },
  {
    title: 'Reviewing code an agent wrote',
    body: 'Five lenses, each running in a context with no access to the implementation. Written after reviews that ran in the authoring context passed changes carrying cross-tenant IDOR and privilege escalation.',
    to: '/docs/review-process',
  },
  {
    title: 'Gaps that survive any provider choice',
    body: 'Capability gaps across the protocol, trust, resource-server, credential, relationship and conformance layers — the ones that are properties of the standards rather than of a vendor.',
    to: '/docs/identity-capability-gap-analysis-2026-09-05',
  },
  {
    title: 'Agent memory as an authorization problem',
    body: 'A thesis with four decisions deliberately left open and nothing built. Permission-filtered retrieval is a mature category; acting on behalf of someone, for a stated reason, is not. Published at the stage where it can still be wrong.',
    to: '/docs/governed-brain-where-it-stands',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="The decisions behind a certified identity library"
      description="Every claim in this repository is checked against source rather than against another document. The authorization comparisons, certification strategy, review model and research behind identity-model — with the evidence for each.">
      <header className={styles.hero}>
        <div className={styles.inner}>
          <div className={styles.heroGrid}>
            <div>
              <h1 className={styles.heroTitle}>
                The decisions behind a certified identity library.
              </h1>
              <p className={styles.heroBody}>
                No application code lives here. This is the reasoning — the authorization
                comparisons, the certification strategy, the review model, the research — and
                the evidence behind each of them. Documents here are checked against the source
                tree and live APIs, never against each other, and the result is published even
                when the result is that the document was wrong.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.actionPrimary} to="/docs">
                  Read the decisions
                </Link>
                <Link className={styles.actionSecondary} href={IM_DOCS}>
                  identity-model docs
                </Link>
              </div>
            </div>

            <div className={styles.heroVerdict}>
              <Verdict
                claimed={
                  <>
                    “The Python library stays its own repository; consolidation is deferred
                    until identity-model is more mature.”
                  </>
                }
                source="docs/roadmap.md, before 2026-09-15"
                measured={
                  <>
                    identity-model contains py/ go/ rust/ spec/ infra/ conformance/
                    <br />
                    latest tag py-v3.18.1 · epics #535, #536, #537 all closed
                  </>
                }
                verdict="False. It had already shipped."
              />
            </div>
          </div>
        </div>
      </header>

      {/* The method, shown rather than described */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>
            A planning document is the thing most likely to be wrong.
          </h2>
          <p className={styles.lede}>
            So it gets measured. On 2026-09-15 the entire corpus — 152 files, 314,672 words —
            was checked against the source tree and live APIs. Eighty-six files were retired.
            These are three of the findings.
          </p>

          <div className={styles.verdicts}>
            <Verdict
              claimed="“Secrets migrate to HCP Vault.” Seven open issues, written 2026-09-04."
              source="identity-stack#398–#405"
              measured={
                <>
                  HCP Vault Secrets: end of life 2026-07-01, already passed
                  <br />
                  HCP Vault Dedicated: ~$1,152/month, against a free-only constraint
                  <br />
                  identity-stack: no Vault provider, no variable sets in Terraform
                </>
              }
              verdict="Dead twice over. What actually runs is HCP Terraform variable sets."
            />
            <Verdict
              claimed="“Status is tracked in task-queue.md and sprint-plan.md.”"
              source="retired 2026-09-05"
              measured={
                <>
                  16 task-queue rows marked pending against closed issues
                  <br />
                  18 more in the sprint plan · 136 of 152 files carried no
                  <br />
                  resolvable GitHub reference at all — 91% by volume
                </>
              }
              verdict="Retired. Status lives in GitHub issues and nowhere else."
            />
            <Verdict
              claimed="“The review passed.” Four pull requests, reviewed in the context that wrote them."
              source="identity-stack#178–#181"
              measured={
                <>
                  re-reviewed cold, with no access to the implementation:
                  <br />
                  cross-tenant IDOR · privilege escalation · resource leaks
                </>
              }
              verdict="A reviewer that wrote the code confirms its own work."
            />
          </div>

          <p className={styles.note}>
            The full audit, including what was retired and why, is the{' '}
            <Link to="/docs/reground-2026-09-15-design">re-grounding design</Link>. Retired
            files are indexed with the command that prints each one back out of git history.
          </p>
        </div>
      </section>

      {/* What is actually here */}
      <section className={styles.sectionAlt}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>What is here</h2>
          <ul className={styles.bodies}>
            {BODIES.map((b) => (
              <li key={b.title} className={styles.body}>
                <h3 className={styles.bodyTitle}>
                  <Link to={b.to}>{b.title}</Link>
                </h3>
                <p className={styles.bodyText}>{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The library — evidence for its one claim, then a link out */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>The library this reasoning is for</h2>
          <p className={styles.lede}>
            <Link href={IM}>identity-model</Link> implements OpenID Connect and OAuth 2.0
            natively in Python, Go and Rust. Its claim is that the three behave identically.
            That claim gets the same treatment as every other.
          </p>

          <div className={styles.codeTabs}>
            <Tabs groupId="lang">
              <TabItem value="py" label="Python">
                <CodeBlock language="python">{PY}</CodeBlock>
              </TabItem>
              <TabItem value="go" label="Go">
                <CodeBlock language="go">{GO}</CodeBlock>
              </TabItem>
              <TabItem value="rust" label="Rust">
                <CodeBlock language="rust">{RUST}</CodeBlock>
              </TabItem>
            </Tabs>
          </div>

          <Verdict
            failed={false}
            claimed="“Every implementation behaves the same everywhere.”"
            measured={
              <>
                119 conformance cases across 12 capabilities, written once as
                <br />
                language-neutral JSON and executed by all three implementations
                <br />
                coverage gate fails CI if a runner skips one · 4 providers in the harness
                <br />
                Python certified by the OpenID Foundation as a Relying Party, 2 July 2026
              </>
            }
            verdict="Enforced, not asserted."
          />

          <p className={styles.note}>
            Installation, the API reference and the capability matrix live with the library:{' '}
            <Link href={IM_DOCS}>identity-model documentation</Link> ·{' '}
            <Link href={`${IM}/blob/main/spec/capabilities.md`}>capability matrix</Link>
          </p>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.inner}>
          <div className={styles.split}>
            <div>
              <h2 className={styles.sectionTitleSmall}>Where status lives</h2>
              <p className={styles.lede}>
                GitHub issues, and nowhere else. These documents hold reasoning and
                decomposition; they never say whether something is done.
              </p>
              <Link
                className={styles.actionSecondary}
                href="https://github.com/jamescrowley321/identity-stack-planning/issues">
                Open issues
              </Link>
            </div>
            <div>
              <h2 className={styles.sectionTitleSmall}>If you are an agent</h2>
              <p className={styles.lede}>
                Start at <code>AGENTS.md</code> for what is authoritative and what must not be
                touched. Two files publish at the site root to be fetched rather than read:{' '}
                <a href="/identity-stack-planning/llms.txt">llms.txt</a> and{' '}
                <a href="/identity-stack-planning/workspace.yml">workspace.yml</a>.
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
