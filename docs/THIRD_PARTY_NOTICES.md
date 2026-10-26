# Third-party notices and dependency licenses

This index covers BAYORA's exact upstream provenance and every direct runtime and development dependency pinned in the current `package.json`/`pnpm-lock.yaml`. The identifiers and versions below were checked against the installed packages' own `package.json` license metadata; complete package-distributed license texts are copied into this repository at the linked paths.

## Upstream Phoenix provenance

The separate verified Phoenix source baseline is [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix), commit `f74341ff0f7f806bc474b37e8ce9e684bab3a0f1`. It is licensed under Elastic License 2.0 and carries an Arize AI IP notice. BAYORA does not bundle Phoenix application source or run a hosted Phoenix service; these copies preserve the provenance/legal notices for the verified baseline.

- [Exact Phoenix Elastic License 2.0 text](../third-party-notices/phoenix/LICENSE)
- [Exact Arize AI IP notice](../third-party-notices/phoenix/IP_NOTICE)
- [Source boundary and material license conditions](upstream-and-license.md)

## Direct runtime dependencies

| Package | Pinned version | Declared license | Role | Full notice |
| --- | ---: | --- | --- | --- |
| `@fontsource-variable/geist` | 5.3.0 | OFL-1.1 | Bundled interface typeface | [License](../third-party-notices/runtime/@fontsource-variable-geist-LICENSE.txt) |
| `@fontsource/ibm-plex-mono` | 5.3.0 | OFL-1.1 | Bundled interface typeface | [License](../third-party-notices/runtime/@fontsource-ibm-plex-mono-LICENSE.txt) |
| `express` | 5.3.0 | MIT | API and server runtime | [License](../third-party-notices/runtime/express-LICENSE.txt) |
| `lucide-react` | 1.61.0 | ISC | Interface icons | [License](../third-party-notices/runtime/lucide-react-LICENSE.txt) |
| `react` | 19.3.1 | MIT | User-interface library | [License](../third-party-notices/runtime/react-LICENSE.txt) |
| `react-dom` | 19.3.1 | MIT | Browser rendering | [License](../third-party-notices/runtime/react-dom-LICENSE.txt) |
| `react-router-dom` | 7.18.4 | MIT | Client-side routing | [License](../third-party-notices/runtime/react-router-dom-LICENSE.txt) |

The font files are distributed without modification from their pinned packages under the packages' SIL Open Font License 1.1 terms.

## Direct development, build, and test dependencies

| Package | Pinned version | Declared license | Role | Full notice |
| --- | ---: | --- | --- | --- |
| `@eslint/js` | 10.0.1 | MIT | ESLint base configuration | [License](../third-party-notices/development/@eslint-js-LICENSE.txt) |
| `@types/express` | 5.0.6 | MIT | Express type declarations | [License](../third-party-notices/development/@types-express-LICENSE.txt) |
| `@types/node` | 22.20.5 | MIT | Node.js type declarations | [License](../third-party-notices/development/@types-node-LICENSE.txt) |
| `@types/react` | 19.3.0 | MIT | React type declarations | [License](../third-party-notices/development/@types-react-LICENSE.txt) |
| `@types/react-dom` | 19.3.0 | MIT | React DOM type declarations | [License](../third-party-notices/development/@types-react-dom-LICENSE.txt) |
| `@vitejs/plugin-react` | 5.2.0 | MIT | Vite React plugin | [License](../third-party-notices/development/@vitejs-plugin-react-LICENSE.txt) |
| `eslint` | 10.13.0 | MIT | Linting | [License](../third-party-notices/development/eslint-LICENSE.txt) |
| `globals` | 17.13.0 | MIT | ESLint environment globals | [License](../third-party-notices/development/globals-LICENSE.txt) |
| `tsx` | 4.23.15 | MIT | TypeScript dev server/test runner | [License](../third-party-notices/development/tsx-LICENSE.txt) |
| `typescript` | 5.9.3 | Apache-2.0 | TypeScript compiler | [License](../third-party-notices/development/typescript-LICENSE.txt) |
| `typescript-eslint` | 8.72.0 | MIT | TypeScript ESLint integration | [License](../third-party-notices/development/typescript-eslint-LICENSE.txt) |
| `vite` | 7.3.7 | MIT | Frontend development/build tool | [License](../third-party-notices/development/vite-LICENSE.txt) |

## Scope and BAYORA licensing

`pnpm-lock.yaml` pins the complete transitive package resolution. This inventory identifies the exact direct dependencies; it is not a legal opinion or a claim that every transitive package has been separately reviewed in this document. Package names, versions, and licenses must be refreshed when dependencies change.

No independent license has been assigned to original BAYORA code because the owner has not selected one. Repository visibility, GitHub metadata, and the Phoenix ELv2 notices do not grant or imply a license to the BAYORA implementation. Do not apply the Phoenix license to BAYORA's original code or remove upstream notices from any Phoenix-derived material.
