import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import ConnectivityEditor from '../components/islands/ConnectivityEditor'

describe('ConnectivityEditor', () => {
  it('renders all 6 protocol toggles', () => {
    render(<ConnectivityEditor value={{}} onChange={() => {}} />)
    expect(screen.getByText('WiFi')).toBeInTheDocument()
    expect(screen.getByText('BLE')).toBeInTheDocument()
    expect(screen.getByText('LoRa')).toBeInTheDocument()
    expect(screen.getByText('Zigbee')).toBeInTheDocument()
    expect(screen.getByText('Thread')).toBeInTheDocument()
    expect(screen.getByText('Ethernet')).toBeInTheDocument()
  })

  it('active protocol has colored styling', () => {
    render(<ConnectivityEditor value={{ wifi: true, ble: false }} onChange={() => {}} />)
    const wifiBtn = screen.getByText('WiFi')
    const bleBtn = screen.getByText('BLE')
    expect(wifiBtn.className).toContain('bg-sky-50')
    expect(bleBtn.className).toContain('bg-slate-100')
  })

  it('clicking toggle calls onChange with flipped value', async () => {
    const onChange = vi.fn()
    render(<ConnectivityEditor value={{ wifi: true, ble: false }} onChange={onChange} />)
    await userEvent.click(screen.getByText('WiFi'))
    expect(onChange).toHaveBeenCalledWith({ wifi: false, ble: false })
  })
})
