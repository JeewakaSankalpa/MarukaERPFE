const OFFICE_TIME_ZONE = 'Asia/Colombo';

const pad2 = (value) => String(value).padStart(2, '0');

export const getOfficeTodayString = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: OFFICE_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());

    const byType = parts.reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return `${byType.year}-${byType.month}-${byType.day}`;
};

export const formatAttendanceDate = (value) => {
    if (!value) return '-';
    return String(value).split('T')[0] || '-';
};

export const formatAttendanceTime = (value) => {
    if (!value) return '-';

    const text = String(value);
    if (!text.includes('T')) {
        const date = new Date(text);
        return Number.isNaN(date.getTime())
            ? '-'
            : date.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', timeZone: OFFICE_TIME_ZONE });
    }

    const time = text.split('T')[1]?.split(/[.+-]/)[0];
    const [hourText, minuteText] = (time || '').split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (Number.isNaN(hour) || Number.isNaN(minute)) return '-';

    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${pad2(hour12)}:${pad2(minute)} ${suffix}`;
};

export const formatAttendanceDateTime = (value) => {
    if (!value) return '-';
    return `${formatAttendanceDate(value)} ${formatAttendanceTime(value)}`;
};

export const toDateTimeLocalValue = (value, fallback) => {
    const source = value || fallback;
    if (!source) return '';
    return String(source).slice(0, 16);
};
