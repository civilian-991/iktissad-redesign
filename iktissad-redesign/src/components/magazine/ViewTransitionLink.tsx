'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'

interface ViewTransitionLinkProps {
  href: string
  /**
   * CSS view-transition-name value applied to this element.
   * The matching target element should have the same view-transition-name
   * so the browser animates between them.
   *
   * Example: viewTransitionName="article-cover-123"
   */
  viewTransitionName?: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * ViewTransitionLink — A Next.js Link wrapper that uses the View Transitions API
 * when available (Chrome 111+, Edge 111+) for smooth morphing animations.
 *
 * When View Transitions are NOT supported (Firefox, Safari <18), it falls through
 * to standard Next.js client-side navigation with no visual difference.
 *
 * Usage:
 *   <ViewTransitionLink
 *     href="/magazine/42/read/article-id"
 *     viewTransitionName="article-cover-article-id"
 *   >
 *     <img src={cover} style={{ viewTransitionName: 'article-cover-article-id' }} />
 *   </ViewTransitionLink>
 *
 * The viewTransitionName should match between the thumbnail here and
 * the hero image on the article page for a shared-element transition.
 */
export function ViewTransitionLink({
  href,
  viewTransitionName,
  children,
  className,
  style,
}: ViewTransitionLinkProps) {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Only intercept left-click without modifiers (let Ctrl+click open new tab normally)
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      e.preventDefault()
      // @ts-ignore — View Transitions API (not yet in TypeScript lib)
      document.startViewTransition(() => {
        router.push(href)
      })
    }
    // No View Transitions support → let standard Link handle navigation
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      style={
        viewTransitionName
          ? { ...style, viewTransitionName }
          : style
      }
    >
      {children}
    </Link>
  )
}
