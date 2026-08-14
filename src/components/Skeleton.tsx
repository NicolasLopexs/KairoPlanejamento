function Line({ width = '100%', height = 11 }: { width?: string; height?: number }) {
  return <div className="skel-line" style={{ width, height, marginBottom: 8 }} />
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="skel-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-card" key={i}>
          <Line width="40%" height={16} />
          <Line width="85%" height={15} />
          <Line width="60%" />
          <Line width="30%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTiles({ count = 3 }: { count?: number }) {
  return (
    <div className="skel-tiles">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-tile" key={i}>
          <Line width="70%" height={16} />
          <Line width="45%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="skel-rows">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-row" key={i}>
          <Line width="30%" height={13} />
          <Line width="50%" height={13} />
        </div>
      ))}
    </div>
  )
}
