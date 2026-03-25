interface Props {
  width?: string
  height?: string
  count?: number
}

export function Skeleton({ width = '100%', height = '1rem', count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ width, height, marginBottom: '0.5rem' }} />
      ))}
    </>
  )
}
