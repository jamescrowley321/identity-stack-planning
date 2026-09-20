import type {ReactNode} from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import {useDoc} from '@docusaurus/plugin-content-docs/client';

type Props = WrapperProps<typeof ContentType>;

/**
 * Every document states when it was last checked and what standing it has, so a
 * reader never has to guess whether a page still describes the current program.
 * The values come from front-matter, which is also what an agent reads.
 */
export default function ContentWrapper(props: Props): ReactNode {
  const {frontMatter} = useDoc();
  const status = frontMatter.status as string | undefined;
  // An unquoted YAML date parses to a Date, not a string, and React will not
  // render one. Normalise to ISO yyyy-mm-dd either way.
  const raw = frontMatter.last_verified as string | Date | undefined;
  const lastVerified =
    raw instanceof Date ? raw.toISOString().slice(0, 10) : raw;

  return (
    <>
      {(status || lastVerified) && (
        <div className="plan-stamp">
          {status && (
            <span className="plan-stamp__status" data-status={status}>
              {status}
            </span>
          )}
          {lastVerified && <span>Last verified {lastVerified}</span>}
        </div>
      )}
      <Content {...props} />
    </>
  );
}
