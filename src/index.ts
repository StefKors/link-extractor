export interface ExtractLinksOptions {
  stripWWW?: boolean
  removeQueryParameters?: boolean
  defaultProtocol?: string
  excludeMailto?: boolean
  excludeJavascript?: boolean
}

export interface LinkEntry {
  url: string
  elements: HTMLAnchorElement[]
}

function normalizeUrl(raw: string, options: ExtractLinksOptions): string | null {
  let url = raw.trim()
  if (!url || url === "/" || url === "#") return null

  const proto = options.defaultProtocol ?? "https"

  if (url.startsWith("//")) {
    url = `${proto}:${url}`
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    url = `${proto}://${url}`
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  parsed.protocol = parsed.protocol.toLowerCase()

  if (options.excludeMailto !== false && parsed.protocol === "mailto:") return null
  if (options.excludeJavascript !== false && parsed.protocol === "javascript:") return null

  if (options.stripWWW && parsed.hostname.startsWith("www.")) {
    parsed.hostname = parsed.hostname.slice(4)
  }

  if (options.removeQueryParameters) {
    parsed.search = ""
  }

  let result = parsed.toString()

  if (result.endsWith("/") && !raw.trim().endsWith("/")) {
    result = result.slice(0, -1)
  }

  return result
}

export function extractLinks(
  root: HTMLElement,
  options: ExtractLinksOptions = {},
): LinkEntry[] {
  const anchors = root.querySelectorAll<HTMLAnchorElement>("a[href]")
  const map = new Map<string, HTMLAnchorElement[]>()

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href")
    if (!href) continue

    const normalized = normalizeUrl(href, options)
    if (!normalized) continue

    const existing = map.get(normalized)
    if (existing) {
      existing.push(anchor)
    } else {
      map.set(normalized, [anchor])
    }
  }

  const entries: LinkEntry[] = []
  for (const [url, elements] of map) {
    entries.push({ url, elements })
  }
  return entries
}

export function observeLinks(
  root: HTMLElement,
  callback: (links: LinkEntry[]) => void,
  options: ExtractLinksOptions = {},
): () => void {
  callback(extractLinks(root, options))

  const observer = new MutationObserver(() => {
    callback(extractLinks(root, options))
  })

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  })

  const disconnect = observer.disconnect.bind(observer)
  return disconnect
}
