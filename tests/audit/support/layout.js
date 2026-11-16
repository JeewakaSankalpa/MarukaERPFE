async function measureLayout(page) {
    return page.evaluate(() => {
        const root = document.documentElement;
        const viewport = { width: root.clientWidth, height: root.clientHeight };
        const candidates = [];
        const localScrollers = [];
        const scrollerElements = new Set();

        for (const element of document.body.querySelectorAll('*')) {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const overflowX = style.overflowX;
            const isScroller = ['auto', 'scroll'].includes(overflowX) && element.scrollWidth > element.clientWidth + 1;
            if (isScroller) {
                scrollerElements.add(element);
                localScrollers.push(describeElement(element, rect));
            }
        }

        for (const element of document.body.querySelectorAll('*')) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            // Off-canvas navigation is intentionally translated entirely outside
            // the viewport at compact breakpoints. It is not clipped content.
            if (rect.right <= 0 || rect.left >= viewport.width) continue;
            const containedByLocalScroller = [...scrollerElements].some((scroller) => scroller !== element && scroller.contains(element));
            if (containedByLocalScroller) continue;
            if (rect.left < -1 || rect.right > viewport.width + 1) {
                candidates.push(describeElement(element, rect));
            }
        }

        return {
            viewport,
            document: { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, overflow: root.scrollWidth - root.clientWidth },
            clippedOrEscaping: candidates.slice(0, 100),
            localScrollers: localScrollers.slice(0, 100),
        };

        function describeElement(element, rect) {
            return {
                tag: element.tagName.toLowerCase(),
                id: element.id || null,
                classes: [...element.classList].slice(0, 5),
                role: element.getAttribute('role'),
                rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) },
                scroll: { clientWidth: element.clientWidth, scrollWidth: element.scrollWidth },
            };
        }
    });
}

module.exports = { measureLayout };
