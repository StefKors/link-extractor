<p align="center">
<h1 align="center">link-extractor</h1>
</p>

#### Supported Platforms
<img src="https://stefkors.com/api/platform/index.svg?os=web" />

Extract and normalize links from HTML elements. Scans anchor tags, deduplicates URLs, and watches for DOM changes with MutationObserver.

## Install

```bash
bun add @kors/link-extractor
```

## Usage

### Extract links from a container

```typescript
import { extractLinks } from "@kors/link-extractor"

const links = extractLinks(document.body, {
  stripWWW: true,
  removeQueryParameters: true,
})

for (const { url, elements } of links) {
  console.log(url, `(${elements.length} anchors)`)
}
```

### Watch for new links in dynamic content

```typescript
import { observeLinks } from "@kors/link-extractor"

const cleanup = observeLinks(document.body, (links) => {
  console.log("Links changed:", links.length)
}, { stripWWW: true })

// Later, stop observing
cleanup()
```

## API

### `extractLinks(root, options?): LinkEntry[]`

Scans all `<a href="...">` elements inside `root`, normalizes and deduplicates URLs, and returns an array of entries.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stripWWW` | `boolean` | `false` | Remove `www.` prefix from hostnames |
| `removeQueryParameters` | `boolean` | `false` | Strip query string from URLs |
| `defaultProtocol` | `string` | `"https"` | Protocol to prepend to bare domains |
| `excludeMailto` | `boolean` | `true` | Filter out `mailto:` links |
| `excludeJavascript` | `boolean` | `true` | Filter out `javascript:` links |

#### Returns

```typescript
interface LinkEntry {
  url: string
  elements: HTMLAnchorElement[]
}
```

### `observeLinks(root, callback, options?): () => void`

Calls `callback` immediately with current links, then again whenever the DOM changes (child nodes added/removed, `href` attributes modified). Returns a cleanup function to disconnect the observer.

## License

MIT
