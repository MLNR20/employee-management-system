import { useEffect, useState } from "react";
import { initialValuesFor, toPayload, validateFields } from "./formRules";

const inputClass =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5";

const noList = () => ({ data: [] });

/**
 * Builds a form from a list of field definitions (see formRules.js for the
 * shape). It owns values, validation and error display; the caller only gives
 * it fields and an onSubmit that receives the cleaned payload.
 *
 * Props:
 *   fields         field definitions
 *   initialValues  optional source (e.g. a loaded entity); the form refills when it changes
 *   onSubmit       (payload) => void | Promise, called only when validation passes
 *   isSubmitting   disables Save and shows "Saving..."
 *   submitLabel    default "Save"
 *   onCancel       when given, shows a Cancel button
 *   isEditing      true when changing an existing record: fields marked lockOnEdit become read-only
 */
export default function FormBuilder({
  fields,
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
  isEditing = false,
}) {
  const [values, setValues] = useState(() => initialValuesFor(fields, initialValues));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) setValues(initialValuesFor(fields, initialValues));
  }, [initialValues, fields]);

  const setValue = (name, value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();

    const found = validateFields(fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSubmit(toPayload(fields, values));
  };

  return (
    <form onSubmit={submit} className="grid gap-6 mb-6 md:grid-cols-2" noValidate>
      {fields.map((field) => (
        <div
          key={field.name}
          // Inline (not a utility class): the app's CSS is a prebuilt Flowbite file that lacks col-span.
          style={field.type === "textarea" || field.wide ? { gridColumn: "1 / -1" } : undefined}
        >
          <Field
            field={field}
            value={values[field.name]}
            onChange={(v) => setValue(field.name, v)}
            disabled={isEditing && Boolean(field.lockOnEdit)}
          />
          {field.hint && !errors[field.name] && (
            <p className="mt-1 text-xs text-gray-500">{field.hint}</p>
          )}
          {errors[field.name] && <label className="text-sm text-red-500">{errors[field.name]}</label>}
        </div>
      ))}

      <div className="flex gap-2" style={{ gridColumn: "1 / -1", alignItems: "flex-start" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ opacity: isSubmitting ? 0.5 : 1 }}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-800 border border-gray-300 hover:bg-gray-50 font-medium rounded-lg text-sm px-5 py-2.5"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ field, value, onChange, disabled }) {
  const id = `field-${field.name}`;
  const type = field.type ?? "text";

  if (type === "checkbox") {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-gray-900 mt-8">
        <input
          id={id}
          type="checkbox"
          disabled={disabled}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 border border-gray-300 rounded bg-gray-50"
        />
        {field.label}
      </label>
    );
  }

  return (
    <>
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-900">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : type === "select" ? (
        <SelectInput id={id} field={field} value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={type === "number" ? "any" : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} ${disabled ? "opacity-60" : ""}`}
        />
      )}
    </>
  );
}

// Options come either from a fixed list or from another resource's list hook.
function SelectInput({ id, field, value, onChange, disabled }) {
  const { data: loaded = [] } = (field.optionsFrom?.useList ?? noList)();
  const options = field.optionsFrom
    ? loaded.map((item) => ({ value: field.optionsFrom.value(item), label: field.optionsFrom.label(item) }))
    : field.options ?? [];

  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} ${disabled ? "opacity-60" : ""}`}
    >
      <option value="">Choose {(field.label ?? field.name).toLowerCase()}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
