import { useCallback, useRef, useState, type PointerEvent as RPE } from 'react'

/**
 * Touch- and mouse-friendly drag-to-reorder for a list or grid.
 * Put `ref` on the container (its direct children are the items) and call
 * `start(e, index)` from a handle's onPointerDown. The item follows your finger,
 * the tile under it is highlighted, and on release the item moves to that position.
 */
export function useDragReorder(onMove: (from: number, to: number) => void) {
  const container = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<{ from: number; to: number } | null>(null)
  const ref = useCallback((el: HTMLElement | null) => { container.current = el }, [])

  const start = (e: RPE, index: number) => {
    const c = container.current
    const el = c?.children[index] as HTMLElement | undefined
    if (!c || !el) return
    e.preventDefault()

    const r = el.getBoundingClientRect()
    const ghost = el.cloneNode(true) as HTMLElement
    Object.assign(ghost.style, {
      position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none', opacity: '.96',
      boxShadow: '0 14px 36px rgba(0,0,0,.28)', transform: 'scale(1.04) rotate(1.2deg)',
    })
    document.body.appendChild(ghost)

    const l = { from: index, to: index, gx: e.clientX - r.left, gy: e.clientY - r.top, x: e.clientX, y: e.clientY, raf: 0 }
    setState({ from: index, to: index })
    const scroller = c.closest('.main') as HTMLElement | null

    const place = () => {
      ghost.style.left = l.x - l.gx + 'px'
      ghost.style.top = l.y - l.gy + 'px'
      const kids = Array.from(c.children)
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i].getBoundingClientRect()
        if (l.x >= k.left && l.x <= k.right && l.y >= k.top && l.y <= k.bottom) {
          if (i !== l.to) { l.to = i; setState({ from: l.from, to: i }) }
          break
        }
      }
    }
    const loop = () => {
      if (scroller) {
        const s = scroller.getBoundingClientRect()
        if (l.y < s.top + 80) scroller.scrollTop -= 14
        else if (l.y > s.bottom - 80) scroller.scrollTop += 14
        place()
      }
      l.raf = requestAnimationFrame(loop)
    }
    l.raf = requestAnimationFrame(loop)

    const move = (ev: PointerEvent) => { l.x = ev.clientX; l.y = ev.clientY; place() }
    const finish = (commit: boolean) => {
      cancelAnimationFrame(l.raf)
      ghost.remove()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      setState(null)
      if (commit && l.to !== l.from) onMove(l.from, l.to)
    }
    const up = () => finish(true)
    const cancel = () => finish(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  return { ref, start, state }
}

export const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = arr.slice()
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}
