import toast from "react-hot-toast";

export const notify = {
  success: (msg: string) =>
    toast.success(msg, {
      duration: 4000,
      style: {
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid #4ade80",
        fontSize: "14px",
        maxWidth: "380px",
      },
      iconTheme: { primary: "#4ade80", secondary: "var(--bg-card)" },
    }),

  error: (msg: string) =>
    toast.error(msg, {
      duration: 6000,
      style: {
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid #f87171",
        fontSize: "14px",
        maxWidth: "380px",
      },
      iconTheme: { primary: "#f87171", secondary: "var(--bg-card)" },
    }),

  loading: (msg: string) =>
    toast.loading(msg, {
      style: {
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        fontSize: "14px",
      },
    }),

  dismiss: (id?: string) => toast.dismiss(id),

  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) =>
    toast.promise(promise, msgs, {
      style: {
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        fontSize: "14px",
        maxWidth: "380px",
      },
      success: { iconTheme: { primary: "#4ade80", secondary: "var(--bg-card)" } },
      error:   { iconTheme: { primary: "#f87171", secondary: "var(--bg-card)" } },
    }),
};
