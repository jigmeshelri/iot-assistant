interface Props {
  className?: string
}

export default function Spinner({ className = 'w-4 h-4 border-white' }: Props) {
  return (
    <span
      className={`inline-block border-2 border-t-transparent rounded-full animate-spin ${className}`}
      aria-hidden="true"
    />
  )
}
