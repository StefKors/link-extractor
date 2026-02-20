import { describe, it, expect, vi } from "vitest"
import { extractLinks, observeLinks } from "../src/index"

function html(markup: string): HTMLElement {
  const div = document.createElement("div")
  div.innerHTML = markup
  return div
}

describe("extractLinks", () => {
  it("extracts links from anchor elements", () => {
    const root = html(`
      <a href="https://example.com">Example</a>
      <a href="https://other.com/page">Other</a>
    `)
    const links = extractLinks(root)
    expect(links).toHaveLength(2)
    expect(links[0].url).toBe("https://example.com")
    expect(links[1].url).toBe("https://other.com/page")
  })

  it("deduplicates identical URLs", () => {
    const root = html(`
      <a href="https://example.com">First</a>
      <a href="https://example.com">Second</a>
    `)
    const links = extractLinks(root)
    expect(links).toHaveLength(1)
    expect(links[0].elements).toHaveLength(2)
  })

  it("filters out mailto links by default", () => {
    const root = html(`<a href="mailto:test@example.com">Email</a>`)
    const links = extractLinks(root)
    expect(links).toHaveLength(0)
  })

  it("filters out javascript: links by default", () => {
    const root = html(`<a href="javascript:void(0)">Click</a>`)
    const links = extractLinks(root)
    expect(links).toHaveLength(0)
  })

  it("filters out empty hrefs", () => {
    const root = html(`<a href="">Empty</a>`)
    const links = extractLinks(root)
    expect(links).toHaveLength(0)
  })

  it("filters out bare slash hrefs", () => {
    const root = html(`<a href="/">Root</a>`)
    const links = extractLinks(root)
    expect(links).toHaveLength(0)
  })

  it("filters out hash-only hrefs", () => {
    const root = html(`<a href="#">Hash</a>`)
    const links = extractLinks(root)
    expect(links).toHaveLength(0)
  })

  it("normalizes protocol to lowercase", () => {
    const root = html(`<a href="HTTP://EXAMPLE.COM">Loud</a>`)
    const links = extractLinks(root)
    expect(links).toHaveLength(1)
    expect(links[0].url).toMatch(/^http:/)
  })

  it("strips www when option is set", () => {
    const root = html(`<a href="https://www.example.com">WWW</a>`)
    const links = extractLinks(root, { stripWWW: true })
    expect(links[0].url).toBe("https://example.com")
  })

  it("removes query parameters when option is set", () => {
    const root = html(`<a href="https://example.com/page?ref=123&utm=abc">Tracked</a>`)
    const links = extractLinks(root, { removeQueryParameters: true })
    expect(links[0].url).toBe("https://example.com/page")
  })

  it("includes mailto when excludeMailto is false", () => {
    const root = html(`<a href="mailto:hi@example.com">Mail</a>`)
    const links = extractLinks(root, { excludeMailto: false })
    expect(links).toHaveLength(1)
    expect(links[0].url).toBe("mailto:hi@example.com")
  })

  it("returns elements array referencing the actual DOM nodes", () => {
    const root = html(`<a href="https://example.com">Link</a>`)
    const links = extractLinks(root)
    expect(links[0].elements[0]).toBeInstanceOf(HTMLAnchorElement)
    expect(links[0].elements[0].textContent).toBe("Link")
  })

  it("adds default protocol to bare domains", () => {
    const root = html(`<a href="example.com">Bare</a>`)
    const links = extractLinks(root)
    expect(links[0].url).toBe("https://example.com")
  })

  it("uses custom default protocol", () => {
    const root = html(`<a href="example.com">Bare</a>`)
    const links = extractLinks(root, { defaultProtocol: "http" })
    expect(links[0].url).toBe("http://example.com")
  })
})

describe("observeLinks", () => {
  it("calls callback immediately with existing links", () => {
    const root = html(`<a href="https://example.com">Link</a>`)
    const cb = vi.fn()
    const cleanup = observeLinks(root, cb)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0]).toHaveLength(1)
    cleanup()
  })

  it("calls callback when new nodes are added", async () => {
    const root = html(`<a href="https://example.com">Initial</a>`)
    const cb = vi.fn()
    const cleanup = observeLinks(root, cb)

    const newAnchor = document.createElement("a")
    newAnchor.href = "https://new-link.com"
    newAnchor.textContent = "New"
    root.appendChild(newAnchor)

    // MutationObserver fires asynchronously
    await new Promise((r) => setTimeout(r, 50))

    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(2)
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0]
    expect(lastCall).toHaveLength(2)
    cleanup()
  })

  it("returns a cleanup function that stops observing", async () => {
    const root = html("")
    const cb = vi.fn()
    const cleanup = observeLinks(root, cb)
    cleanup()

    const anchor = document.createElement("a")
    anchor.href = "https://after-cleanup.com"
    root.appendChild(anchor)

    await new Promise((r) => setTimeout(r, 50))

    // Only the initial call, no mutation callback
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
