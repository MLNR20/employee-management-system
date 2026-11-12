import Card from "./Card";
import Navbar_DS from "./navbar_ds";
import SideBar from "./sidebar";

/** The signed-in shell used by every dashboard page: sidebar, top bar and a content card. */
export default function PageLayout({ title, actions, children }) {
  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div className="p-8 sm:ml-64">
        <Card title={title} actions={actions} className="mt-14">
          {children}
        </Card>
      </div>
    </div>
  );
}
