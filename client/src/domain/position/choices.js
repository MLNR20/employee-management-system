// What the employee form offers. Employees store department and position names as text, so a name that
// has since been removed or renamed is still offered to the employee who holds it, marked as unlisted.

const byName = (a, b) => a.name.localeCompare(b.name);

const withCurrent = (names, current) => {
  const choices = [...new Set(names)].map((name) => ({ name, listed: true })).sort(byName);
  if (current && !names.includes(current)) choices.push({ name: current, listed: false });
  return choices;
};

export const departmentChoices = (departments, current) =>
  withCurrent(departments.filter((d) => d.isActive !== false).map((d) => d.name), current);

export const positionChoices = (departments, positions, departmentName, current) => {
  const department = departments.find((d) => d.name === departmentName);
  const names = positions
    .filter((p) => department && p.departmentId === department.id && p.isActive !== false)
    .map((p) => p.name);
  return departmentName ? withCurrent(names, current) : [];
};
