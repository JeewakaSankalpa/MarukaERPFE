const DIALOG_EVENT = "maruka:dialog-request";

const resolveRequest = (request) => new Promise((resolve) => {
    if (typeof window === "undefined") {
        resolve(request.type === "prompt" ? null : false);
        return;
    }

    window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
        detail: {
            request,
            resolve,
        },
    }));
});

export const confirmAction = (options) => resolveRequest({
    type: "confirm",
    tone: "danger",
    title: "Confirm action",
    message: typeof options === "string" ? options : options?.message,
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    ...((typeof options === "object" && options) ? options : {}),
});

export const promptAction = (options) => resolveRequest({
    type: "prompt",
    tone: "info",
    title: "Add note",
    message: "",
    label: "Notes",
    defaultValue: "",
    confirmLabel: "Continue",
    cancelLabel: "Cancel",
    multiline: false,
    ...((typeof options === "object" && options) ? options : { label: options }),
});

export { DIALOG_EVENT };
