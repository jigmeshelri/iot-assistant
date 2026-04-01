import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Spinner from '../components/islands/Spinner'

describe('Spinner', () => {
  it('renders with animate-spin class', () => {
    const { container } = render(<Spinner />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('animate-spin')
  })

  it('applies default classes when no className given', () => {
    const { container } = render(<Spinner />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('w-4')
    expect(el.className).toContain('h-4')
    expect(el.className).toContain('border-white')
  })

  it('applies custom className overriding the default', () => {
    const { container } = render(<Spinner className="w-6 h-6 border-teal-500" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('w-6')
    expect(el.className).toContain('h-6')
    expect(el.className).toContain('border-teal-500')
    expect(el.className).toContain('animate-spin')
  })
})
