function getAllElementsIncludingShadowRoots(root: Node = document): HTMLElement[] {
    const result: HTMLElement[] = [];

    const traverse = (node: Node) => {
        if (node instanceof HTMLElement) {
            result.push(node);

            // If it has a shadow root, recurse into it
            if (node.shadowRoot) {
                traverse(node.shadowRoot);
            }
        }

        // Recurse through all child nodes
        node.childNodes.forEach((child) => traverse(child));
    };

    traverse(root);
    return result;
}


function findAllColors() {
    const colors: string[] = [];
    const allElements = getAllElementsIncludingShadowRoots();
    console.log(allElements.length);
    allElements.forEach((element) => {
        const style = window.getComputedStyle(element);
        if (!colors.includes(style.color)) {
            colors.push(style.color);
        }
        if (!colors.includes(style.backgroundColor)) {
            colors.push(style.backgroundColor);
        }
    });
    return colors;
}

chrome.runtime.onMessage.addListener(function (message, _, sendResponse) {
    if (message.action === "color-scanner") {
        sendResponse({ colors: findAllColors() });
    }

    if (message.action === "highlight-color" && message.color) {
        const colorToFind = message.color.replace(/\s+/g, '');
        const allElements = getAllElementsIncludingShadowRoots();

        // Remove outlines from all highlighted elements
        getAllElementsIncludingShadowRoots().forEach((el) => {
            if (el.dataset.highlighted === "true") {
                el.style.outline = "";
                el.removeAttribute("data-highlighted");
            }
        });

        // Remove overlay elements from all shadow roots and main document
        const removeOverlays = (root: Node) => {
            root.childNodes.forEach((child) => {
                if (child instanceof HTMLElement) {
                    if (child.classList.contains("color-highlight-overlay")) {
                        child.remove();
                    }

                    // Recurse into shadow root if present
                    if (child.shadowRoot) {
                        removeOverlays(child.shadowRoot);
                    }
                }

                // Recurse into child nodes
                if (child.hasChildNodes()) {
                    removeOverlays(child);
                }
            });
        };

        removeOverlays(document);

        // Apply highlights and overlays
        allElements.forEach((el) => {
            const style = getComputedStyle(el);
            const bg = style.backgroundColor.replace(/\s+/g, '');
            const text = style.color.replace(/\s+/g, '');
            let matched = null;

            if (bg === colorToFind) matched = `${el.localName} -> background`;
            else if (text === colorToFind) matched = `${el.localName} -> color`;

            if (matched) {
                el.style.outline = "2px solid red";
                el.dataset.highlighted = "true";

                const overlay = document.createElement("div");
                overlay.className = "color-highlight-overlay";
                overlay.innerText = `Matched: ${matched}`;
                overlay.style.position = "absolute";
                overlay.style.fontSize = "10px";
                overlay.style.fontFamily = "monospace";
                overlay.style.color = "#fff";
                overlay.style.backgroundColor = "rgba(0,0,0,0.7)";
                overlay.style.padding = "2px 4px";
                overlay.style.borderRadius = "4px";
                overlay.style.zIndex = "999999";
                overlay.style.pointerEvents = "none";

                const rect = el.getBoundingClientRect();
                overlay.style.top = `${window.scrollY + rect.top}px`;
                overlay.style.left = `${window.scrollX + rect.left}px`;

                document.body.appendChild(overlay);
            }
        });
    }
});

