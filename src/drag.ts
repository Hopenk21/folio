import { useCallback, useRef, useState, type MouseEvent as RME, type PointerEvent as RPE } from 'react'

/**
 * Drag-to-reorder for a list or grid, started from anywhere on an item.
 * - Touch: press and hold an item for a moment, then drag. A quick swipe still scrolls the page.
 * - Mouse: click and drag.
 * Put `ref` on the container (its direct children are the items) and spread `bind(index)` on each
 * item. The item lifts and follows your finger, the item under it is highlighted, and on release
 * it moves to that position. Buttons inside an item still work as normal.
 */
export function useDragReorder(onMove: (from: number, to: number) => void) {
  const container = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<{ from: number; to: number } | null>(null)
  const ref = useCallback((el: HTMLElement | null) => { container.current = el }, [])

  const begin = (index: number, x0: number, y0: number) => {
    const c = container.current
    const el = c?.children[index] as HTMLElement | undefined
    if (!c || !el) return

    const r = el.getBoundingClientRect()
    const ghost = el.cloneNode(true) as HTMLElement
    Object.assign(ghost.style, {
      position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none', opacity: '.96',
      boxShadow: '0 14px 36px rgba(0,0,0,.28)', transform: 'scale(1.04) rotate(1.2deg)',
    })
    document.body.appendChild(ghost)

    const l = { from: index, to: index, gx: x0 - r.left, gy: y0 - r.top, x: x0, y: y0, raf: 0 }
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
    // Once an item is picked up, the page must not scroll under the finger.
    const block = (ev: TouchEvent) => { if (ev.cancelable) ev.preventDefault() }
    const finish = (commit: boolean) => {
      cancelAnimationFrame(l.raf)
      ghost.remove()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('touchmove', block)
      setState(null)
      if (commit && l.to !== l.from) onMove(l.from, l.to)
    }
    const up = () => finish(true)
    const cancel = () => finish(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('touchmove', block, { passive: false })
  }

  const press = (e: RPE, index: number) => {
    const touch = e.pointerType !== 'mouse'
    if (!touch && e.button !== 0) return
    const sx = e.clientX
    const sy = e.clientY
    let x = sx
    let y = sy
    let timer = 0

    const stop = () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    const fire = () => {
      stop()
      try { navigator.vibrate?.(12) } catch { /* no haptics */ }
      begin(index, x, y)
    }
    const mv = (ev: PointerEvent) => {
      x = ev.clientX
      y = ev.clientY
      const d = Math.hypot(x - sx, y - sy)
      if (touch) { if (d > 10) stop() } // finger moved first: it's a scroll, not a pick-up
      else if (d > 4) fire()
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    if (touch) timer = window.setTimeout(fire, 280)
  }

  const bind = (index: number) => ({
    onPointerDown: (e: RPE) => {
      if ((e.target as HTMLElement).closest('button, a, input')) return // let buttons work normally
      press(e, index)
    },
    onContextMenu: (e: RME) => e.preventDefault(),
  })

  return { ref, bind, state }
}

export const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = arr.slice()
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}
