import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import ProjectFilters from '../components/islands/ProjectFilters'

const projects = [
  { id: 'p1', title: 'Active Project', description: null, status: 'in_progress', project_type: 'diy', difficulty: 'beginner', progress: 50, updated_at: '2026-03-25', source: 'manual' },
  { id: 'p2', title: 'Done Project', description: null, status: 'completed', project_type: 'prototype', difficulty: 'advanced', progress: 100, updated_at: '2026-03-24', source: 'ai_discover' },
  { id: 'p3', title: 'Saved Project', description: null, status: 'saved', project_type: 'diy', difficulty: null, progress: 0, updated_at: '2026-03-23', source: 'manual' },
]

describe('ProjectFilters', () => {
  it('"Todos" tab shows all projects', () => {
    render(<ProjectFilters projects={projects} />)
    expect(screen.getAllByText('Active Project').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Done Project').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Saved Project').length).toBeGreaterThanOrEqual(1)
  })

  it('"Activos" tab shows only in_progress', async () => {
    render(<ProjectFilters projects={projects} />)
    await userEvent.click(screen.getByText('Activos', { exact: false }))
    expect(screen.getAllByText('Active Project').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Done Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved Project')).not.toBeInTheDocument()
  })

  it('"Completados" tab shows only completed', async () => {
    render(<ProjectFilters projects={projects} />)
    await userEvent.click(screen.getByText('Completados', { exact: false }))
    expect(screen.getAllByText('Done Project').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Active Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved Project')).not.toBeInTheDocument()
  })

  it('"Archivados" tab shows saved+paused+abandoned', async () => {
    render(<ProjectFilters projects={projects} />)
    await userEvent.click(screen.getByText('Archivados', { exact: false }))
    expect(screen.getAllByText('Saved Project').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Active Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Done Project')).not.toBeInTheDocument()
  })
})
