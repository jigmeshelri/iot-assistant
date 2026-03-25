import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import SpecsEditor from '../components/islands/SpecsEditor'

describe('SpecsEditor', () => {
  it('renders existing key-value pairs', () => {
    render(<SpecsEditor value={{ voltaje: '3.3V' }} onChange={() => {}} />)
    expect(screen.getByDisplayValue('voltaje')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3.3V')).toBeInTheDocument()
  })

  it('add button creates new empty row', async () => {
    const onChange = vi.fn()
    render(<SpecsEditor value={{ voltaje: '3.3V' }} onChange={onChange} />)

    await userEvent.click(screen.getByText('+ Añadir especificación'))

    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(Object.keys(lastCall).length).toBe(2)
    expect(lastCall).toHaveProperty('voltaje', '3.3V')
  })

  it('delete button removes row and calls onChange', async () => {
    const onChange = vi.fn()
    render(<SpecsEditor value={{ voltaje: '3.3V', corriente: '500mA' }} onChange={onChange} />)

    const deleteButtons = screen.getAllByText('\u00d7')
    await userEvent.click(deleteButtons[0])

    expect(onChange).toHaveBeenCalledWith({ corriente: '500mA' })
  })

  it('editing value calls onChange', async () => {
    const onChange = vi.fn()
    render(<SpecsEditor value={{ voltaje: '3.3V' }} onChange={onChange} />)

    const valueInput = screen.getByDisplayValue('3.3V')
    await userEvent.clear(valueInput)
    await userEvent.type(valueInput, '5V')

    expect(onChange).toHaveBeenLastCalledWith({ voltaje: '5V' })
  })
})
