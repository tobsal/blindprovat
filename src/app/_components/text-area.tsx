type TextAreaProps = {
  id: string;
  name: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  maxLength?: number;
  rows?: number;
  ref?: React.Ref<HTMLTextAreaElement>;
};

// Samma upplägg som TextField: synlig etikett och fel kopplat med
// aria-describedby.
export function TextArea({
  id,
  name,
  label,
  hint,
  error,
  defaultValue,
  maxLength,
  rows = 4,
  ref,
}: TextAreaProps) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-on-surface-variant">
          {hint}
        </p>
      )}
      <textarea
        ref={ref}
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="rounded border border-outline bg-surface px-4 py-3 text-base"
      />
      {error && (
        <p id={`${id}-error`} className="text-error">
          <strong>Fel:</strong> {error}
        </p>
      )}
    </div>
  );
}
