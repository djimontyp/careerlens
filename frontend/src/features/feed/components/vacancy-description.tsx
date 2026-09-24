import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import type { VacancyDetail } from "@/features/feed/api"

type HeadingLikeNode = {
  type: string
  depth?: number
  alt?: string
  value?: string
  children?: HeadingLikeNode[]
}

const MIN_RENDERED_HEADING_DEPTH = 3
const MAX_RENDERED_HEADING_DEPTH = 6

/**
 * Rewrites markdown heading depths so the shallowest heading present
 * renders as h3, preserving relative nesting, so no description heading
 * can collide with the page's own h1/h2 hierarchy.
 */
function remarkDemoteHeadings() {
  return (tree: HeadingLikeNode) => {
    const headings: HeadingLikeNode[] = []
    let shallowestDepth = Number.POSITIVE_INFINITY

    const collectHeadings = (node: HeadingLikeNode) => {
      if (node.type === "heading" && typeof node.depth === "number") {
        headings.push(node)
        shallowestDepth = Math.min(shallowestDepth, node.depth)
      }
      node.children?.forEach(collectHeadings)
    }
    collectHeadings(tree)

    if (headings.length === 0) return

    const offset = MIN_RENDERED_HEADING_DEPTH - shallowestDepth
    for (const heading of headings) {
      heading.depth = Math.min(
        MAX_RENDERED_HEADING_DEPTH,
        (heading.depth ?? MIN_RENDERED_HEADING_DEPTH) + offset,
      )
    }
  }
}

/**
 * The `img` component override below always renders a standalone image as
 * its own `<a>`. Left alone, an image that Markdown already nests inside a
 * link (a linked logo or badge) would render as an `<a>` inside that link's
 * own `<a>`, which breaks the link's destination for a mouse click. This
 * replaces such a nested image with its plain alt text before rendering, so
 * the surrounding link stays the only clickable element.
 */
function remarkUnwrapImagesInsideLinks() {
  return (tree: HeadingLikeNode) => {
    const visit = (node: HeadingLikeNode, insideLink: boolean) => {
      if (!node.children) return
      node.children = node.children.map((child) => {
        if (
          insideLink &&
          (child.type === "image" || child.type === "imageReference")
        ) {
          return { type: "text", value: child.alt ?? "" }
        }
        const childIsLink =
          child.type === "link" || child.type === "linkReference"
        visit(child, insideLink || childIsLink)
        return child
      })
    }
    visit(tree, false)
  }
}

export function VacancyDescription({ vacancy }: { vacancy: VacancyDetail }) {
  return (
    <section className="min-w-0" aria-label="Опис вакансії">
      {vacancy.description_status === "markdown" ? (
        <div className="min-w-0 text-sm leading-7 text-foreground [&>*:first-child]:mt-0 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border-b [&_td]:p-2 [&_th]:border-b [&_th]:p-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
          <Markdown
            remarkPlugins={[
              remarkGfm,
              remarkDemoteHeadings,
              remarkUnwrapImagesInsideLinks,
            ]}
            components={{
              a: ({ node: _node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
              img: ({ src, alt }) => {
                const href = typeof src === "string" ? src : undefined
                if (href && /^https?:\/\//.test(href)) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      {alt || href}
                    </a>
                  )
                }
                return <>{alt}</>
              },
              h3: ({ node: _node, ...props }) => (
                <h3 className="mt-6 text-xl font-semibold" {...props} />
              ),
              h4: ({ node: _node, ...props }) => (
                <h4 className="mt-6 text-lg font-semibold" {...props} />
              ),
              h5: ({ node: _node, ...props }) => (
                <h5 className="mt-5 font-semibold" {...props} />
              ),
              h6: ({ node: _node, ...props }) => (
                <h6 className="mt-5 font-semibold" {...props} />
              ),
            }}
          >
            {vacancy.description}
          </Markdown>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-7">
          {vacancy.description}
        </p>
      )}
    </section>
  )
}
