type SourceIdentityProps = {
  source: {
    name: string
    icon_url: string | null
  }
}

export function SourceIdentity({ source }: SourceIdentityProps) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {source.icon_url && (
        <img
          src={source.icon_url}
          alt=""
          className="size-3.5 shrink-0 rounded-sm object-contain"
          onError={(event) => event.currentTarget.remove()}
        />
      )}
      <span className="truncate">{source.name}</span>
    </span>
  )
}
