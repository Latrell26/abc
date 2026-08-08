type PlaceholderPageProps = {
  badge?: string;
  title: string;
  description: string;
  items?: string[];
};

export function PlaceholderPage({
  badge,
  title,
  description,
  items = [],
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-start gap-6">
      <div>
        {badge ? (
          <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {badge}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>
      </div>

      {items.length > 0 ? (
        <ul className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-border bg-card p-4 shadow-card"
            >
              <p className="text-sm font-medium text-card-foreground">{item}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="rounded-md bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
        Placeholder — implemented in a later phase.
      </p>
    </div>
  );
}
