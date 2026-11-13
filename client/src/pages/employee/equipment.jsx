import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import PortalLayout from "../../components/employee/PortalLayout";
import { employeePortal } from "../../container";

const messageOf = (error) => error?.response?.data?.message ?? "Something went wrong. Please try again.";

function EquipmentRow({ item, action, label, busy }) {
  return (
    <li className="leave-item">
      <div>
        <p className="leave-item-title">{item.name}</p>
        <p className="leave-item-meta">
          {[item.category, item.serialNumber, item.location].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button type="button" className="leave-cancel" onClick={() => action(item._id)} disabled={busy}>
        {label}
      </button>
    </li>
  );
}

/**
 * Company equipment. The left column lists what can be borrowed; an item someone else is borrowing
 * is not listed at all. The right column holds what this employee has borrowed, to give back.
 */
export default function EmployeeEquipment() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const equipment = useQuery({ queryKey: ["employee-portal", "equipment"], queryFn: employeePortal.getEquipment });
  const available = equipment.data?.available ?? [];
  const borrowed = equipment.data?.borrowed ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["employee-portal", "equipment"] });

  const borrow = useMutation({
    mutationFn: employeePortal.borrowEquipment,
    onSuccess: (item) => enqueueSnackbar(`You borrowed ${item.name}.`, { variant: "success" }),
    onError: (error) => enqueueSnackbar(messageOf(error), { variant: "error" }),
    onSettled: refresh, // also after a failure: someone else may have just taken the item
  });

  const giveBack = useMutation({
    mutationFn: employeePortal.returnEquipment,
    onSuccess: (item) => enqueueSnackbar(`You returned ${item.name}.`, { variant: "success" }),
    onError: (error) => enqueueSnackbar(messageOf(error), { variant: "error" }),
    onSettled: refresh,
  });

  return (
    <PortalLayout>
      <div className="portal-columns">
        <section className="portal-panel" aria-labelledby="equipment-available-heading">
          <h2 id="equipment-available-heading" className="portal-panel-title">
            Available to borrow
          </h2>
          {available.length === 0 ? (
            <p className="portal-empty">{equipment.isLoading ? "Loading…" : "Nothing is available right now."}</p>
          ) : (
            <ul className="leave-list">
              {available.map((item) => (
                <EquipmentRow key={item._id} item={item} action={borrow.mutate} label="Borrow" busy={borrow.isPending} />
              ))}
            </ul>
          )}
        </section>

        <section className="portal-panel" aria-labelledby="equipment-borrowed-heading">
          <h2 id="equipment-borrowed-heading" className="portal-panel-title">
            Borrowed by me
          </h2>
          {borrowed.length === 0 ? (
            <p className="portal-empty">{equipment.isLoading ? "Loading…" : "You have not borrowed anything."}</p>
          ) : (
            <ul className="leave-list">
              {borrowed.map((item) => (
                <EquipmentRow key={item._id} item={item} action={giveBack.mutate} label="Return" busy={giveBack.isPending} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}
