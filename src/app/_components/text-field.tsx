type TextFieldProps = {
  id: string;
  name: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  inputMode?: "numeric";
  autoComplete?: string;
  autoCapitalize?: "characters";
  required?: boolean;
  ref?: React.Ref<HTMLInputElement>;
};

// Fältet markeras ogiltigt och kopplas till sitt fel med aria-describedby,
// så att felet läses upp när fokus flyttas hit. Formuläret ansvarar för att
// flytta fokus till första felaktiga fältet.
export function TextField({
  id,
  name,
  label,
  hint,
  error,
  defaultValue,
  inputMode,
  autoComplete,
  autoCapitalize,
  required,
  ref,
}: TextFieldProps) {
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
      <input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="min-h-12 rounded border border-outline bg-surface px-4 text-base"
      />
      {error && (
        <p id={`${id}-error`} className="text-error">
          <strong>Fel:</strong> {error}
        </p>
      )}
    </div>
  );
}
