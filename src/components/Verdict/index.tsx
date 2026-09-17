import type {ReactNode} from 'react';
import styles from './styles.module.css';

export type VerdictProps = {
  /** What a document asserted, quoted. */
  claimed: ReactNode;
  /** Where the claim was made, and when. */
  source?: ReactNode;
  /** What checking it against source or a live API returned. */
  measured: ReactNode;
  /** The one-line result. Lead with the word: False / Dead / Retired. */
  verdict: ReactNode;
  /** false when the claim survived checking. */
  failed?: boolean;
};

/**
 * The house format of this repository, as a component.
 *
 * Every document here states claims and then checks them against the source tree or a
 * live API rather than against another document — including when the answer is that
 * the document was wrong. This renders that shape so the evidence is the design.
 */
export default function Verdict({
  claimed,
  source,
  measured,
  verdict,
  failed = true,
}: VerdictProps): ReactNode {
  return (
    <figure className={styles.verdict} data-failed={failed ? 'true' : undefined}>
      <div className={styles.row}>
        <dfn className={styles.label}>Claimed</dfn>
        <p className={styles.claimed}>
          {claimed}
          {source && <span className={styles.source}>{source}</span>}
        </p>
      </div>
      <div className={styles.row}>
        <dfn className={styles.label}>Measured</dfn>
        <p className={styles.measured}>{measured}</p>
      </div>
      <div className={styles.row}>
        <dfn className={styles.label}>Verdict</dfn>
        <p className={styles.result}>{verdict}</p>
      </div>
    </figure>
  );
}
