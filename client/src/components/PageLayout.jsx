import Navbar_DS from "./navbar_ds";
import SideBar from "./sidebar";

/** The signed-in shell used by every dashboard page: sidebar, top bar and a content card. */
export default function PageLayout({ title, actions, children }) {
  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div className="p-8 sm:ml-64">
        <div className="p-4 border-2 shadow-lg bg-white border-gray-200 border-solid rounded-lg mt-14">
          <div className="p-8 mb-4">
            <div className="flex flex-row items-center justify-between">
              <h1 className="font-bold text-2xl">{title}</h1>
              {actions}
            </div>
            <div className="overflow-auto mt-6">
              <div className="relative p-2 overflow-x-auto">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
