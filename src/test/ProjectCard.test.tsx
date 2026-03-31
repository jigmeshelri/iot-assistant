import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ProjectCard from '../components/islands/ProjectCard'

const defaultProps = {
  id: 'p1',
  title: 'Estación meteorológica',
  description: 'Sensor de temperatura y humedad',
  status: 'saved',
  project_type: 'diy',
  difficulty: 'intermediate',
  tags: ['WiFi', 'sensor'],
}

describe('ProjectCard', () => {
  it('renders project title and description', () => {
    render(<ProjectCard {...defaultProps} />)
    expect(screen.getByText('Estación meteorológica')).toBeInTheDocument()
    expect(screen.getByText('Sensor de temperatura y humedad')).toBeInTheDocument()
  })

  it('renders type and difficulty', () => {
    render(<ProjectCard {...defaultProps} />)
    expect(screen.getByText('diy')).toBeInTheDocument()
    expect(screen.getByText('intermediate')).toBeInTheDocument()
  })

  it('shows status badge with correct label for saved', () => {
    render(<ProjectCard {...defaultProps} />)
    const badge = screen.getByText('Guardado')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-slate-100')
  })

  it('shows correct badge for in_progress status', () => {
    render(<ProjectCard {...defaultProps} status="in_progress" />)
    const badge = screen.getByText('En progreso')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-brand-50')
  })

  it('shows correct badge for completed status', () => {
    render(<ProjectCard {...defaultProps} status="completed" />)
    const badge = screen.getByText('Completado')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-green-50')
  })

  it('renders tag badges', () => {
    render(<ProjectCard {...defaultProps} />)
    expect(screen.getByText('WiFi')).toBeInTheDocument()
    expect(screen.getByText('sensor')).toBeInTheDocument()
  })

  it('shows fork count when greater than 0', () => {
    render(<ProjectCard {...defaultProps} direct_fork_count={5} />)
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('does not show fork count when 0', () => {
    render(<ProjectCard {...defaultProps} direct_fork_count={0} />)
    expect(screen.queryByText(/🍴/)).not.toBeInTheDocument()
  })

  it('links to project detail page', () => {
    render(<ProjectCard {...defaultProps} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/projects/p1')
  })
})
