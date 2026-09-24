/* eslint-disable testing-library/no-unnecessary-act */
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import BrandedDialogHost from "./BrandedDialogHost";
import { promptAction } from "../../utils/brandedDialogs";

test("keeps typed prompt text without repeatedly selecting it", async () => {
    window.IS_REACT_ACT_ENVIRONMENT = true;
    const selectSpy = jest.spyOn(HTMLTextAreaElement.prototype, "select");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
        root.render(<BrandedDialogHost />);
    });

    let promptResult;
    await act(async () => {
        promptResult = promptAction({ label: "Notes", multiline: true });
    });

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(selectSpy).toHaveBeenCalledTimes(1);

    const notes = container.querySelector("textarea");
    await act(async () => {
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        valueSetter.call(notes, "Received in good condition");
        notes.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(notes.value).toBe("Received in good condition");

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(selectSpy).toHaveBeenCalledTimes(1);

    const continueButton = [...container.querySelectorAll("button")]
        .find(button => button.textContent === "Continue");
    await act(async () => {
        continueButton.click();
    });
    await expect(promptResult).resolves.toBe("Received in good condition");

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    await act(async () => root.unmount());
    container.remove();
    selectSpy.mockRestore();
    window.IS_REACT_ACT_ENVIRONMENT = false;
});
