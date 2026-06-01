import React from "react";
import { ButtonGroup, Button } from "react-bootstrap";

const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getRange = (days, mode) => {
    const today = new Date();
    const other = new Date(today);
    other.setDate(today.getDate() + (mode === "future" ? days : -(days - 1)));

    return mode === "future"
        ? { startDate: toDateInputValue(today), endDate: toDateInputValue(other) }
        : { startDate: toDateInputValue(other), endDate: toDateInputValue(today) };
};

export default function QuickDateRangeButtons({ onSelect, mode = "past", size = "sm", className = "" }) {
    const labelPrefix = mode === "future" ? "Next" : "Last";

    return (
        <ButtonGroup size={size} className={className}>
            {[30, 60, 90].map(days => (
                <Button
                    key={days}
                    variant="outline-secondary"
                    onClick={() => onSelect?.(getRange(days, mode), days)}
                >
                    {labelPrefix} {days}d
                </Button>
            ))}
        </ButtonGroup>
    );
}
