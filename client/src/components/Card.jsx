/**
 * Reusable content card: a bordered white surface with an optional
 * header (title on the left, actions on the right) above a scrollable body.
 *
 *   <Card title="Employees Management" actions={<AddButton />}>
 *     <DataTable ... />
 *   </Card>
 *
 * compact trims the padding for small cards such as stat tiles.
 * className is appended to the outer element, e.g. for spacing from the parent.
 */
export default function Card({ title, actions, compact = false, className = "", children, ...rest }) {
  const hasHeader = Boolean(title || actions);

  return (
    <div
      className={`p-4 border-2 bg-white border-gray-200 border-solid rounded-lg ${className}`.trim()}
      {...rest}
    >
      <div className={compact ? "p-2" : "p-8 mb-4"}>
        {hasHeader && (
          <div className="flex flex-row items-center justify-between">
            {title && <h1 className="font-bold text-2xl">{title}</h1>}
            {actions}
          </div>
        )}
        <div className={`overflow-auto ${hasHeader ? "mt-6" : ""}`.trim()}>
          <div className="relative p-2 overflow-x-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
