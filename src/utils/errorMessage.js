export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    const data = error?.response?.data;

    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (data?.error && data.error !== "Bad Request") return data.error;
    if (Array.isArray(data?.errors) && data.errors.length) {
        return data.errors
            .map(item => item?.message || item?.defaultMessage || String(item))
            .join(", ");
    }
    if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (error?.message && !error?.response) return error.message;

    return fallback;
};
