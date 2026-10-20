import { notify } from "../notifications.js";

await notify({
  title: "Attendance Updated",
  message: "An attendance record was updated.",
  type: "info",
  link: "/attendance",
});
